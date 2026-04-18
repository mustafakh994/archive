"""Generate FormsManagementApi.postman_collection.json — run: python generate_collection.py"""
import json
from pathlib import Path


def req(
    name,
    method,
    path,
    body=None,
    auth_bearer=True,
    tests=None,
    extra_headers=None,
    raw_body=None,
    query=None,
):
    """body=dict is JSON-serialized. raw_body=str sends as raw (e.g. JSON string primitive). body omitted if None."""
    full = path.lstrip("/")
    path_only, _, qs = full.partition("?")
    parts = [p for p in path_only.split("/") if p]
    raw = "{{baseUrl}}/" + full
    url = {"raw": raw, "host": ["{{baseUrl}}"], "path": parts}
    query_pairs = []
    if qs:
        for pair in qs.split("&"):
            if not pair or "=" not in pair:
                continue
            k, _, v = pair.partition("=")
            query_pairs.append({"key": k, "value": v})
    if query:
        query_pairs = [{"key": k, "value": str(v)} for k, v in query.items()]
        q = "&".join(f"{k}={v}" for k, v in query.items())
        raw = "{{baseUrl}}/" + path_only + "?" + q
        url["raw"] = raw
    if query_pairs:
        url["query"] = query_pairs
    headers = list(extra_headers or [])
    r = {"method": method, "header": headers, "url": url}
    if raw_body is not None:
        headers.append({"key": "Content-Type", "value": "application/json", "type": "text"})
        r["body"] = {"mode": "raw", "raw": raw_body}
    elif body is not None:
        if method in ("POST", "PUT", "PATCH"):
            headers.append({"key": "Content-Type", "value": "application/json", "type": "text"})
        r["body"] = {"mode": "raw", "raw": json.dumps(body, indent=2)}
    if not auth_bearer:
        r["auth"] = {"type": "noauth"}
    out = {"name": name, "request": r}
    if tests:
        out["event"] = [{"listen": "test", "script": {"exec": tests, "type": "text/javascript"}}]
    return out


def folder(name, items):
    return {"name": name, "item": items}


def main():
    login_tests = [
        "var j = pm.response.json();",
        "if (j.success && j.data) {",
        '  if (j.data.token) pm.collectionVariables.set("accessToken", j.data.token);',
        '  if (j.data.refreshToken) pm.collectionVariables.set("refreshToken", j.data.refreshToken);',
        "  if (j.data.user && j.data.user.id) pm.collectionVariables.set(\"userId\", j.data.user.id);",
        "}",
    ]

    coll = {
        "info": {
            "name": "Forms Management API (Mobile)",
            "description": (
                "ASP.NET **FormsManagementApi** for mobile clients.\n\n"
                "1. Set collection variable **baseUrl** (no trailing slash), e.g. `https://api.example.com`.\n"
                "2. Run **Auth > Login** — tests save **accessToken**, **refreshToken**, **userId**.\n\n"
                "Responses: camelCase `ApiResponse<T>` → `success`, `message`, `data`, `errors`.\n"
                "Auth header: `Authorization: Bearer {{accessToken}}`.\n"
                "JWT claims include standard `sub` (user id), `email`, `role`, and `DepartmentId`."
            ),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "auth": {
            "type": "bearer",
            "bearer": [{"key": "token", "value": "{{accessToken}}", "type": "string"}],
        },
        "variable": [
            {"key": "baseUrl", "value": "https://localhost:7001"},
            {"key": "accessToken", "value": ""},
            {"key": "refreshToken", "value": ""},
            {"key": "formId", "value": ""},
            {"key": "submissionId", "value": ""},
            {"key": "departmentId", "value": ""},
            {"key": "userId", "value": ""},
            {"key": "roleId", "value": ""},
            {"key": "fileId", "value": ""},
            {"key": "exportId", "value": ""},
            {"key": "assignmentId", "value": ""},
            {"key": "permissionId", "value": ""},
            {"key": "formCode", "value": ""},
        ],
        "item": [
            folder(
                "Auth",
                [
                    req(
                        "Login",
                        "POST",
                        "/api/Auth/login",
                        {"email": "user@example.com", "password": "password"},
                        auth_bearer=False,
                        tests=login_tests,
                    ),
                    req(
                        "Register",
                        "POST",
                        "/api/Auth/register",
                        {
                            "name": "New User",
                            "email": "new@example.com",
                            "password": "secret12",
                            "departmentId": None,
                            "role": "User",
                        },
                        auth_bearer=False,
                    ),
                    req(
                        "Refresh token",
                        "POST",
                        "/api/Auth/refresh",
                        {"refreshToken": "{{refreshToken}}"},
                        auth_bearer=False,
                    ),
                    req(
                        "Logout",
                        "POST",
                        "/api/Auth/logout",
                        {"refreshToken": "{{refreshToken}}"},
                        auth_bearer=False,
                    ),
                    req(
                        "Change password",
                        "POST",
                        "/api/Auth/change-password",
                        {"currentPassword": "", "newPassword": ""},
                    ),
                    req("Profile (claims)", "GET", "/api/Auth/profile"),
                ],
            ),
            folder(
                "Departments",
                [
                    req("List departments", "GET", "/api/Departments"),
                    req("Get department", "GET", "/api/Departments/{{departmentId}}"),
                    req("Create department", "POST", "/api/Departments", {"name": "Dept", "description": ""}),
                    req(
                        "Update department",
                        "PUT",
                        "/api/Departments/{{departmentId}}",
                        {"name": "Dept", "description": ""},
                    ),
                    req("Delete department", "DELETE", "/api/Departments/{{departmentId}}"),
                ],
            ),
            folder(
                "Roles",
                [
                    req("List roles by department", "GET", "/api/Roles/department/{{departmentId}}"),
                    req("Get role", "GET", "/api/Roles/{{roleId}}"),
                    req(
                        "Create role",
                        "POST",
                        "/api/Roles",
                        {
                            "departmentId": "{{departmentId}}",
                            "name": "Role",
                            "displayName": "Role",
                            "description": "",
                            "isSystemRole": False,
                            "isActive": True,
                            "permissionIds": [],
                        },
                    ),
                    req(
                        "Update role",
                        "PUT",
                        "/api/Roles/{{roleId}}",
                        {"name": "Role", "displayName": "Role", "description": ""},
                    ),
                    req("Delete role", "DELETE", "/api/Roles/{{roleId}}"),
                    req(
                        "Assign permissions to role",
                        "POST",
                        "/api/Roles/{{roleId}}/permissions",
                        raw_body="[]",
                    ),
                ],
            ),
            folder(
                "Permissions",
                [
                    req("List permissions", "GET", "/api/Permissions"),
                    req("List by department", "GET", "/api/Permissions/department/{{departmentId}}"),
                    req("Get permission", "GET", "/api/Permissions/{{permissionId}}"),
                    req(
                        "Create permission",
                        "POST",
                        "/api/Permissions",
                        {
                            "departmentId": "{{departmentId}}",
                            "name": "permission.name",
                            "displayName": "Label",
                            "description": "",
                            "resource": None,
                            "action": None,
                            "isActive": True,
                        },
                    ),
                    req(
                        "Update permission",
                        "PUT",
                        "/api/Permissions/{{permissionId}}",
                        {"name": "p", "description": ""},
                    ),
                    req("Delete permission", "DELETE", "/api/Permissions/{{permissionId}}"),
                ],
            ),
            folder(
                "Users",
                [
                    req("List users", "GET", "/api/Users"),
                    req("Get user", "GET", "/api/Users/{{userId}}"),
                    req(
                        "Create user",
                        "POST",
                        "/api/Users",
                        {
                            "name": "",
                            "email": "",
                            "password": "",
                            "departmentId": None,
                            "roleId": None,
                        },
                    ),
                    req("Update user", "PUT", "/api/Users/{{userId}}", {}),
                    req("Delete user", "DELETE", "/api/Users/{{userId}}"),
                    req("Toggle user status", "PATCH", "/api/Users/{{userId}}/toggle-status"),
                    req("Get user permissions", "GET", "/api/Users/{{userId}}/permissions"),
                    req(
                        "Add user permission",
                        "POST",
                        "/api/Users/{{userId}}/permissions",
                        raw_body=json.dumps("read"),
                    ),
                    req("Remove user permission", "DELETE", "/api/Users/{{userId}}/permissions/read"),
                ],
            ),
            folder(
                "Assignments",
                [
                    req(
                        "Create assignment",
                        "POST",
                        "/api/Assignment",
                        {
                            "userId": "{{userId}}",
                            "departmentId": "{{departmentId}}",
                            "roleId": "{{roleId}}",
                            "isActive": True,
                        },
                    ),
                    req("Get assignment", "GET", "/api/Assignment/{{assignmentId}}"),
                    req("List assignments", "GET", "/api/Assignment"),
                    req("By user", "GET", "/api/Assignment/user/{{userId}}"),
                    req("By department", "GET", "/api/Assignment/department/{{departmentId}}"),
                    req("By role", "GET", "/api/Assignment/role/{{roleId}}"),
                    req(
                        "Update assignment",
                        "PUT",
                        "/api/Assignment/{{assignmentId}}",
                        {
                            "userId": "{{userId}}",
                            "departmentId": "{{departmentId}}",
                            "roleId": "{{roleId}}",
                            "isActive": True,
                        },
                    ),
                    req("Delete assignment", "DELETE", "/api/Assignment/{{assignmentId}}"),
                    req("Deactivate", "PATCH", "/api/Assignment/{{assignmentId}}/deactivate"),
                    req("Activate", "PATCH", "/api/Assignment/{{assignmentId}}/activate"),
                ],
            ),
            folder(
                "Forms",
                [
                    req("List forms", "GET", "/api/Forms"),
                    req("Get form by id", "GET", "/api/Forms/{{formId}}"),
                    req("Get latest schema", "GET", "/api/Forms/{{formId}}/latest"),
                    req("Preview by formId (GUID)", "GET", "/api/Forms/{{formId}}/preview"),
                    req("Preview by id or code", "GET", "/api/Forms/{{formCode}}/preview"),
                    req("Preview by code", "GET", "/api/Forms/code/{{formCode}}/preview"),
                    req(
                        "Create form (shortcut)",
                        "POST",
                        "/api/Forms/create",
                        {"title": "Form", "description": "", "departmentId": None},
                    ),
                    req(
                        "Create form",
                        "POST",
                        "/api/Forms",
                        {"title": "Form", "description": "", "departmentId": None},
                    ),
                    req("Update form", "PUT", "/api/Forms/{{formId}}", {"title": "Form", "description": ""}),
                    req("Delete form", "DELETE", "/api/Forms/{{formId}}"),
                    req("Toggle form status", "PATCH", "/api/Forms/{{formId}}/toggle-status"),
                    req(
                        "List submissions (Forms)",
                        "GET",
                        "/api/Forms/{{formId}}/submissions?page=1&pageSize=10",
                    ),
                    req("Get submission (Forms)", "GET", "/api/Forms/submissions/{{submissionId}}"),
                    req(
                        "Create submission (Forms)",
                        "POST",
                        "/api/Forms/{{formId}}/submissions",
                        {"responseData": {}, "formVersion": 1, "submitterEmail": None},
                    ),
                    req(
                        "Create submission with files (Forms)",
                        "POST",
                        "/api/Forms/{{formId}}/submissions/with-files",
                        {"responseDataJson": "{}", "formVersion": 1},
                    ),
                    req("Delete submission (Forms)", "DELETE", "/api/Forms/submissions/{{submissionId}}"),
                    req("Get form permissions", "GET", "/api/Forms/{{formId}}/permissions"),
                    req(
                        "Add form permission",
                        "POST",
                        "/api/Forms/{{formId}}/permissions",
                        {"formId": "{{formId}}", "userId": "{{userId}}", "permission": "read"},
                    ),
                    req(
                        "Remove form permission",
                        "DELETE",
                        "/api/Forms/{{formId}}/permissions/{{userId}}/read",
                    ),
                ],
            ),
            folder(
                "Form submissions",
                [
                    req(
                        "List all submissions",
                        "GET",
                        "/api/FormSubmissions?page=1&pageSize=10&sortDescending=false",
                    ),
                    req(
                        "Advanced search",
                        "POST",
                        "/api/FormSubmissions/advanced-search",
                        {
                            "page": 1,
                            "pageSize": 10,
                            "formId": None,
                            "departmentId": None,
                            "startDate": None,
                            "endDate": None,
                            "dynamicFilters": {},
                        },
                    ),
                    req(
                        "List by form",
                        "GET",
                        "/api/FormSubmissions/form/{{formId}}?page=1&pageSize=10",
                    ),
                    req("Get submission", "GET", "/api/FormSubmissions/{{submissionId}}"),
                    req(
                        "Create submission",
                        "POST",
                        "/api/FormSubmissions/form/{{formId}}",
                        {"responseData": {}, "formVersion": 1},
                    ),
                    req(
                        "Create with files",
                        "POST",
                        "/api/FormSubmissions/form/{{formId}}/with-files",
                        {"responseDataJson": "{}", "formVersion": 1},
                    ),
                    req("Delete submission", "DELETE", "/api/FormSubmissions/{{submissionId}}"),
                    req(
                        "By version",
                        "GET",
                        "/api/FormSubmissions/form/{{formId}}/version/1?page=1&pageSize=10",
                    ),
                    req(
                        "Create for version",
                        "POST",
                        "/api/FormSubmissions/form/{{formId}}/version/1",
                        {"responseData": {}},
                    ),
                    req(
                        "Create latest",
                        "POST",
                        "/api/FormSubmissions/form/{{formId}}/latest",
                        {"responseData": {}},
                    ),
                    req("List versions", "GET", "/api/FormSubmissions/form/{{formId}}/versions"),
                    req(
                        "Version schema",
                        "GET",
                        "/api/FormSubmissions/form/{{formId}}/version/1/schema",
                    ),
                    req(
                        "Latest version info",
                        "GET",
                        "/api/FormSubmissions/form/{{formId}}/versions/latest",
                    ),
                    req(
                        "Validate for version",
                        "POST",
                        "/api/FormSubmissions/form/{{formId}}/version/1/validate",
                        {},
                    ),
                    req(
                        "Validate (current)",
                        "POST",
                        "/api/FormSubmissions/form/{{formId}}/validate",
                        {},
                    ),
                    req(
                        "Version counts",
                        "GET",
                        "/api/FormSubmissions/form/{{formId}}/analytics/version-counts",
                    ),
                    req("Recent submissions", "GET", "/api/FormSubmissions/form/{{formId}}/recent"),
                    req(
                        "Export data (sync)",
                        "POST",
                        "/api/FormSubmissions/export-data",
                        {
                            "formId": "{{formId}}",
                            "selectedFields": [],
                            "includeMetadata": {
                                "email": True,
                                "submittedAt": True,
                                "ip": False,
                                "version": True,
                            },
                            "filters": {"page": 1, "pageSize": 100},
                        },
                    ),
                    req(
                        "Field definitions",
                        "GET",
                        "/api/FormSubmissions/form/{{formId}}/field-definitions",
                    ),
                ],
            ),
            folder(
                "Files",
                [
                    {
                        "name": "Upload file",
                        "request": {
                            "method": "POST",
                            "header": [],
                            "body": {
                                "mode": "formdata",
                                "formdata": [{"key": "file", "type": "file", "src": []}],
                            },
                            "url": {
                                "raw": "{{baseUrl}}/api/Files/upload",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "Files", "upload"],
                            },
                        },
                    },
                    {
                        "name": "Upload multiple",
                        "request": {
                            "method": "POST",
                            "header": [],
                            "body": {
                                "mode": "formdata",
                                "formdata": [{"key": "files", "type": "file", "src": []}],
                            },
                            "url": {
                                "raw": "{{baseUrl}}/api/Files/upload-multiple",
                                "host": ["{{baseUrl}}"],
                                "path": ["api", "Files", "upload-multiple"],
                            },
                        },
                    },
                    req("Download file", "GET", "/api/Files/download/{{fileId}}"),
                    req("Get file metadata", "GET", "/api/Files/{{fileId}}"),
                    req("Delete file", "DELETE", "/api/Files/{{fileId}}"),
                    req("My files", "GET", "/api/Files/my-files"),
                ],
            ),
            folder(
                "Export (async)",
                [
                    req(
                        "Start export",
                        "POST",
                        "/api/Export/formsubmissions",
                        {
                            "formId": "{{formId}}",
                            "format": "xlsx",
                            "fileName": "export",
                            "selectedFields": [],
                            "includeMetadata": {
                                "email": True,
                                "submittedAt": True,
                                "ip": False,
                                "version": True,
                            },
                            "filters": {"page": 1, "pageSize": 1000},
                        },
                    ),
                    req("Export status", "GET", "/api/Export/status/{{exportId}}"),
                    req("Download export", "GET", "/api/Export/download/{{exportId}}"),
                    req("Cancel export", "POST", "/api/Export/cancel/{{exportId}}"),
                    req(
                        "Cleanup exports (SuperAdmin)",
                        "POST",
                        "/api/Export/cleanup",
                        query={"olderThanHours": "24"},
                    ),
                    req("Recent exports", "GET", "/api/Export/recent"),
                ],
            ),
        ],
    }

    out_path = Path(__file__).resolve().parent / "FormsManagementApi.postman_collection.json"
    out_path.write_text(json.dumps(coll, indent=2, ensure_ascii=False), encoding="utf-8")
    print("Wrote", out_path)


if __name__ == "__main__":
    main()
