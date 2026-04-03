namespace FormsManagementApi.Configuration;

/// <summary>
/// Symmetric key for AES-256-GCM attachment encryption at rest.
/// Set AttachmentEncryption:KeyBase64 to a Base64-encoded 32-byte key (e.g. openssl rand -base64 32).
/// When empty, files are stored in plaintext.
/// </summary>
public class AttachmentEncryptionSettings
{
    public const string SectionName = "AttachmentEncryption";

    /// <summary>Base64 encoding of exactly 32 bytes.</summary>
    public string? KeyBase64 { get; set; }
}
