const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readAccount(formData: FormData, withName: boolean) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (withName && (fullName.length < 2 || fullName.length > 80)) {
    return { error: "Enter a name between 2 and 80 characters." } as const;
  }

  if (!emailPattern.test(email) || email.length > 160) {
    return { error: "Enter a valid email address." } as const;
  }

  if (password.length < 8 || password.length > 72) {
    return { error: "Use a password between 8 and 72 characters." } as const;
  }

  return { email, password, fullName } as const;
}
