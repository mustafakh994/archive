namespace FormsManagementApi.Services;

public interface IAttachmentCrypto
{
    bool IsEnabled { get; }

    /// <summary>True if payload starts with the encrypted-file magic header.</summary>
    bool LooksLikeEncryptedPackage(ReadOnlySpan<byte> data);

    byte[] Encrypt(ReadOnlySpan<byte> plaintext);

    /// <summary>Decrypts an encrypted package; throws if invalid or tampered.</summary>
    byte[] Decrypt(ReadOnlySpan<byte> package);
}
