"use client";

export default function LoginButton() {
  return (
    <a
      href="/api/auth/login"
      className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-8 py-3 font-medium hover:bg-gray-800 transition-colors"
    >
      通过 Second Me 登录
      <span>&rarr;</span>
    </a>
  );
}
