namespace FormsManagementApi.DTOs;

/// <summary>
/// Per-user visibility rules for form submissions when the user is not SuperAdmin / DepartmentAdmin.
/// Built from FormPermission rows for forms in the user's department.
/// </summary>
public sealed class SubmissionQueryContext
{
    public Guid UserId { get; init; }
    public string? UserEmail { get; init; }
    public HashSet<Guid> FullAccessFormIds { get; init; } = new();
    public HashSet<Guid> OwnSubmissionsOnlyFormIds { get; init; } = new();

    public bool IsDenyAll => FullAccessFormIds.Count == 0 && OwnSubmissionsOnlyFormIds.Count == 0;

    public bool CanAccessForm(Guid formId) =>
        !IsDenyAll && (FullAccessFormIds.Contains(formId) || OwnSubmissionsOnlyFormIds.Contains(formId));
}
