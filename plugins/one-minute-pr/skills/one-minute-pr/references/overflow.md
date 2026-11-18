# Overflow

Overflow is content that the reviewer can use but that does not fit in a body of about 40 lines. Examples are full command output, extra performance numbers, and long tables.

Keep the main point in the body, such as the key diagram and the primary number. Move the rest out of the body.

Ask the user where the overflow goes, and wait for the answer:

1. A PR comment, folded in a `<details>` block.
2. A separate document. The user makes it and gives you the link, and you put the link in the body.

Use `<details>` only when the forge renders it. Otherwise the tag shows as plain text, so post the comment without it.

Start the comment with the line `More details (one-minute-pr)`. With `<details>`, that line is the `<summary>`. The forge CLI posts as the user, so this line is the only way a later run can tell your comment from theirs.

This is the only question the skill asks. When nothing overflows, do not ask.

## Second run

Look for a PR comment whose first line or `<summary>` is `More details (one-minute-pr)`. Never edit or delete any other comment.

- If the new body overflows, edit that comment. Do not ask again.
- If nothing overflows now, delete it.
