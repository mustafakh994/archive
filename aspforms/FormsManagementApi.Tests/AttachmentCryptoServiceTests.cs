using System.Security.Cryptography;
using System.Text;
using FormsManagementApi.Configuration;
using FormsManagementApi.Services;
using Microsoft.Extensions.Options;
using Xunit;

namespace FormsManagementApi.Tests;

public class AttachmentCryptoServiceTests
{
    private static AttachmentCryptoService CreateService()
    {
        var key = new byte[32];
        RandomNumberGenerator.Fill(key);
        var settings = Options.Create(new AttachmentEncryptionSettings
        {
            KeyBase64 = Convert.ToBase64String(key),
        });
        return new AttachmentCryptoService(settings);
    }

    [Fact]
    public void EncryptThenDecrypt_RoundTripsUtf8()
    {
        var crypto = CreateService();
        var plain = Encoding.UTF8.GetBytes("hello attachment مرحبا");
        var package = crypto.Encrypt(plain);

        Assert.True(crypto.LooksLikeEncryptedPackage(package));
        var back = crypto.Decrypt(package);
        Assert.Equal(plain, back);
    }

    [Fact]
    public void TamperedPackage_ThrowsOnDecrypt()
    {
        var crypto = CreateService();
        var package = crypto.Encrypt(new byte[] { 1, 2, 3 }).ToArray();
        package[^1] ^= 0xFF;
        Assert.ThrowsAny<CryptographicException>(() => crypto.Decrypt(package));
    }

    [Fact]
    public void WhenKeyMissing_IsEnabledFalse()
    {
        var crypto = new AttachmentCryptoService(Options.Create(new AttachmentEncryptionSettings()));
        Assert.False(crypto.IsEnabled);
    }
}
