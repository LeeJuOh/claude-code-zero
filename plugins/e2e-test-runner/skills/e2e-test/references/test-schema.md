# Test File Schema

E2E tests are defined as JSON arrays of test cases. Each test case contains natural language steps that Claude executes via a browser.

## Schema

```json
[
    {
        "id": "test-case-id",
        "description": "What this test verifies",
        "baseUrl": "https://app.example.com",
        "steps": [
            { "id": 1, "description": "Natural language step description" },
            { "id": 2, "description": "Another step" }
        ]
    }
]
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique test ID (alphanumeric + hyphens only) |
| `description` | string | Yes | What the test verifies |
| `baseUrl` | string | No | Base URL of the app under test |
| `steps` | array | Yes | Ordered list of test steps |
| `steps[].id` | number | Yes | Step number |
| `steps[].description` | string | Yes | What to do in this step (natural language) |

## Examples

### Login Test

```json
[
    {
        "id": "login-test",
        "description": "Verify login with valid credentials",
        "steps": [
            { "id": 1, "description": "Navigate to https://app.example.com/login" },
            { "id": 2, "description": "Enter email address: user@example.com" },
            { "id": 3, "description": "Enter password: testpassword123" },
            { "id": 4, "description": "Click the login button" },
            { "id": 5, "description": "Verify the dashboard page loads and shows a welcome message" }
        ]
    }
]
```

### Form Submission Test

```json
[
    {
        "id": "contact-form-test",
        "description": "Submit contact form and verify confirmation",
        "steps": [
            { "id": 1, "description": "Navigate to https://app.example.com/contact" },
            { "id": 2, "description": "Fill in name field with 'John Doe'" },
            { "id": 3, "description": "Fill in email field with 'john@example.com'" },
            { "id": 4, "description": "Fill in message field with 'This is a test message'" },
            { "id": 5, "description": "Click the submit button" },
            { "id": 6, "description": "Verify a success message appears on the page" }
        ]
    }
]
```

### Multiple Test Cases

```json
[
    {
        "id": "login-success",
        "description": "Login with valid credentials",
        "steps": [
            { "id": 1, "description": "Navigate to https://app.example.com/login" },
            { "id": 2, "description": "Login with email user@example.com and password test123" },
            { "id": 3, "description": "Verify dashboard loads" }
        ]
    },
    {
        "id": "login-failure",
        "description": "Login with invalid credentials shows error",
        "steps": [
            { "id": 1, "description": "Navigate to https://app.example.com/login" },
            { "id": 2, "description": "Login with email user@example.com and password wrongpassword" },
            { "id": 3, "description": "Verify an error message about invalid credentials is displayed" }
        ]
    }
]
```

## Tips

- **Be specific**: "Click the blue Submit button at the bottom of the form" is better than "Submit the form"
- **Include expected outcomes**: "Verify the page shows 'Order confirmed' text" not just "Check the result"
- **One action per step**: Split complex actions into multiple steps for better error reporting
- **Credentials in steps**: Write credentials directly in the step description. Keep test files out of version control if they contain sensitive data.
