using System.Security.Cryptography;
using FormsManagementApi.Configuration;
using Microsoft.Extensions.Options;

namespace FormsManagementApi.Services;

/// <summary>
/// AES-256-GCM format shared with Next.js (see forms_front attachment-crypto):
/// Magic "AENC" (4) + version (1) + nonce (12) + ciphertext (N) + tag (16).
/// </summary>
public sealed class AttachmentCryptoService : IAttachmentCrypto
{
    public const byte FormatVersion = 1;
    public static ReadOnlySpan<byte> Magic => "AENC"u8;

    private const int NonceSize = 12;
    private const int TagSize = 16;
    private const int HeaderSize = 4 + 1 + NonceSize;

    private readonly byte[]? _key;

    public AttachmentCryptoService(IOptions<AttachmentEncryptionSettings> options)
    {
        var b64 = options.Value.KeyBase64;
        if (string.IsNullOrWhiteSpace(b64))
        {
            _key = null;
            return;
        }

        try
        {
            var key = Convert.FromBase64String(b64.Trim());
            if (key.Length != 32)
                throw new InvalidOperationException("AttachmentEncryption:KeyBase64 must decode to exactly 32 bytes for AES-256.");
            _key = key;
        }
        catch (FormatException ex)
        {
            throw new InvalidOperationException("AttachmentEncryption:KeyBase64 is not valid Base64.", ex);
        }
    }

    public bool IsEnabled => _key != null;

    public bool LooksLikeEncryptedPackage(ReadOnlySpan<byte> data)
    {
        if (data.Length < HeaderSize + TagSize)
            return false;
        return data.Slice(0, 4).SequenceEqual(Magic) && data[4] == FormatVersion;
    }

    public byte[] Encrypt(ReadOnlySpan<byte> plaintext)
    {
        if (_key == null)
            throw new InvalidOperationException("Attachment encryption is not configured.");

        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var ciphertext = new byte[plaintext.Length];
        var tag = new byte[TagSize];

        using (var aes = new AesGcm(_key, TagSize))
        {
            aes.Encrypt(nonce, plaintext, ciphertext, tag);
        }

        var package = new byte[HeaderSize + ciphertext.Length + TagSize];
        Magic.CopyTo(package.AsSpan(0, 4));
        package[4] = FormatVersion;
        nonce.AsSpan().CopyTo(package.AsSpan(5, NonceSize));
        ciphertext.AsSpan().CopyTo(package.AsSpan(HeaderSize));
        tag.AsSpan().CopyTo(package.AsSpan(HeaderSize + ciphertext.Length));
        return package;
    }

    public byte[] Decrypt(ReadOnlySpan<byte> package)
    {
        if (_key == null)
            throw new InvalidOperationException("Attachment encryption is not configured.");

        if (!LooksLikeEncryptedPackage(package))
            throw new CryptographicException("Not a valid encrypted attachment package.");

        var nonce = package.Slice(5, NonceSize);
        var cipherLen = package.Length - HeaderSize - TagSize;
        if (cipherLen < 0)
            throw new CryptographicException("Invalid encrypted package length.");

        var ciphertext = package.Slice(HeaderSize, cipherLen);
        var tag = package.Slice(HeaderSize + cipherLen, TagSize);
        var plaintext = new byte[cipherLen];

        using (var aes = new AesGcm(_key, TagSize))
        {
            aes.Decrypt(nonce, ciphertext, tag, plaintext);
        }

        return plaintext;
    }
}
