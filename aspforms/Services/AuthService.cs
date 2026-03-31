using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FormsManagementApi.Configuration;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;
using Microsoft.Extensions.Options;
using AutoMapper;
using Npgsql;

namespace FormsManagementApi.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly JwtSettings _jwtSettings;
    private readonly IMapper _mapper;

    public AuthService(ApplicationDbContext context, IOptions<JwtSettings> jwtSettings, IMapper mapper)
    {
        _context = context;
        _jwtSettings = jwtSettings.Value;
        _mapper = mapper;
    }

    public async Task<ApiResponse<LoginResponseDto>> LoginAsync(LoginDto loginDto)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.Department)
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
            {
                return ApiResponse<LoginResponseDto>.ErrorResponse("Invalid email or password.");
            }

            if (!user.IsActive)
            {
                return ApiResponse<LoginResponseDto>.ErrorResponse("User account is deactivated.");
            }

            var token = GenerateJwtToken(user);
            var refreshToken = GenerateRefreshToken();
            var expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes);

            // Store refresh token in database
            var refreshTokenEntity = new RefreshToken
            {
                Token = refreshToken,
                UserId = user.Id,
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationInDays),
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync();

            var userDto = _mapper.Map<UserDto>(user);
            userDto.Permissions = await LoadUserPermissionsAsync(user.Id);

            var response = new LoginResponseDto
            {
                Token = token,
                RefreshToken = refreshToken,
                User = userDto,
                ExpiresAt = expiresAt
            };

            return ApiResponse<LoginResponseDto>.SuccessResponse(response, "Login successful.");
        }
        catch (Exception ex)
        {
            return ApiResponse<LoginResponseDto>.ErrorResponse($"An error occurred during login: {ex.Message}");
        }
    }

    public async Task<ApiResponse<UserDto>> RegisterAsync(RegisterDto registerDto)
    {
        try
        {
            // Check if user already exists
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == registerDto.Email);
            if (existingUser != null)
            {
                return ApiResponse<UserDto>.ErrorResponse("User with this email already exists.");
            }

            // Validate department if specified
            if (registerDto.DepartmentId.HasValue)
            {
                var department = await _context.Departments.FindAsync(registerDto.DepartmentId.Value);
                if (department == null)
                {
                    return ApiResponse<UserDto>.ErrorResponse("Invalid department.");
                }
            }

            // Find role by name
            Role? role = null;
            if (!string.IsNullOrEmpty(registerDto.Role))
            {
                role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == registerDto.Role);
            }

            var user = new User
            {
                Name = registerDto.Name,
                Email = registerDto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
                RoleId = role?.Id,
                DepartmentId = registerDto.DepartmentId ?? Guid.Empty,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var userDto = _mapper.Map<UserDto>(user);
            return ApiResponse<UserDto>.SuccessResponse(userDto, "User registered successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<UserDto>.ErrorResponse($"An error occurred during registration: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> ChangePasswordAsync(Guid userId, ChangePasswordDto changePasswordDto)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return ApiResponse<bool>.ErrorResponse("User not found.");
            }

            if (!BCrypt.Net.BCrypt.Verify(changePasswordDto.CurrentPassword, user.PasswordHash))
            {
                return ApiResponse<bool>.ErrorResponse("Current password is incorrect.");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(changePasswordDto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Password changed successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while changing password: {ex.Message}");
        }
    }

    public async Task<ApiResponse<LoginResponseDto>> RefreshTokenAsync(string refreshToken)
    {
        try
        {
            // Find the refresh token in the database
            var storedRefreshToken = await _context.RefreshTokens
                .Include(rt => rt.User)
                .ThenInclude(u => u.Department)
                .Include(rt => rt.User)
                .ThenInclude(u => u.Role)
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

            if (storedRefreshToken == null)
            {
                return ApiResponse<LoginResponseDto>.ErrorResponse("Invalid refresh token.");
            }

            if (!storedRefreshToken.IsActive)
            {
                return ApiResponse<LoginResponseDto>.ErrorResponse("Refresh token is expired or revoked.");
            }

            var user = storedRefreshToken.User;
            if (!user.IsActive)
            {
                return ApiResponse<LoginResponseDto>.ErrorResponse("User account is deactivated.");
            }

            // Generate new tokens
            var newToken = GenerateJwtToken(user);
            var newRefreshToken = GenerateRefreshToken();
            var expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes);

            // Revoke the old refresh token
            storedRefreshToken.RevokedAt = DateTimeOffset.UtcNow;

            // Create new refresh token
            var newRefreshTokenEntity = new RefreshToken
            {
                Token = newRefreshToken,
                UserId = user.Id,
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationInDays),
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.RefreshTokens.Add(newRefreshTokenEntity);
            await _context.SaveChangesAsync();

            var userDto = _mapper.Map<UserDto>(user);
            userDto.Permissions = await LoadUserPermissionsAsync(user.Id);

            var response = new LoginResponseDto
            {
                Token = newToken,
                RefreshToken = newRefreshToken,
                User = userDto,
                ExpiresAt = expiresAt
            };

            return ApiResponse<LoginResponseDto>.SuccessResponse(response, "Token refreshed successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<LoginResponseDto>.ErrorResponse($"An error occurred while refreshing token: {ex.Message}");
        }
    }

    public string GenerateJwtToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_jwtSettings.SecretKey);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name ?? ""),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, NormalizeRoleName(user.Role?.Name ?? "User")),
            new Claim("IsActive", user.IsActive.ToString())
        };

        if (user.DepartmentId != Guid.Empty)
        {
            claims.Add(new Claim("DepartmentId", user.DepartmentId.ToString() ?? string.Empty));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes),
            Issuer = _jwtSettings.Issuer,
            Audience = _jwtSettings.Audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private static string NormalizeRoleName(string roleName)
    {
        // Normalize role names to match [Authorize(Roles = "...")] attributes exactly
        if (string.Equals(roleName, "SuperAdmin", StringComparison.OrdinalIgnoreCase))
            return "SuperAdmin";
        if (string.Equals(roleName, "DepartmentAdmin", StringComparison.OrdinalIgnoreCase))
            return "DepartmentAdmin";
        return roleName;
    }

    private async Task<List<PermissionDto>> LoadUserPermissionsAsync(Guid userId)
    {
        try
        {
            var permissions = await _context.UserPermissions
                .Where(up => up.UserId == userId)
                .Include(up => up.Permission)
                .Select(up => up.Permission)
                .ToListAsync();

            return _mapper.Map<List<PermissionDto>>(permissions);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UndefinedTable)
        {
            // Allow login to succeed on databases that have not been updated with the
            // per-user permissions table yet. Users simply get no explicit overrides.
            return new List<PermissionDto>();
        }
    }

    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public async Task<bool> ValidateRefreshTokenAsync(string refreshToken, Guid userId)
    {
        var storedRefreshToken = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken && rt.UserId == userId);

        return storedRefreshToken != null && storedRefreshToken.IsActive;
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken)
    {
        var storedRefreshToken = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

        if (storedRefreshToken != null && storedRefreshToken.IsActive)
        {
            storedRefreshToken.RevokedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task CleanupExpiredRefreshTokensAsync()
    {
        var expiredTokens = await _context.RefreshTokens
            .Where(rt => rt.ExpiresAt <= DateTimeOffset.UtcNow)
            .ToListAsync();

        if (expiredTokens.Any())
        {
            _context.RefreshTokens.RemoveRange(expiredTokens);
            await _context.SaveChangesAsync();
        }
    }
}