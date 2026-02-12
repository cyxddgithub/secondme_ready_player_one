interface UserInfoCardProps {
  name: string | null;
  avatar: string | null;
  secondmeUserId: string;
}

export default function UserInfoCard({ name, avatar, secondmeUserId }: UserInfoCardProps) {
  const displayName = name || "未命名用户";
  const initial = displayName[0];

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* User Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Gradient Header */}
        <div className="h-20 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900" />

        {/* Avatar - overlapping the header */}
        <div className="flex flex-col items-center -mt-10 pb-2">
          {avatar ? (
            <img
              src={avatar}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-gray-500">
              {initial}
            </div>
          )}

          {/* User Info */}
          <h3 className="mt-3 text-lg font-bold text-gray-900">{displayName}</h3>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{secondmeUserId}</p>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 mt-3 px-3 py-1 bg-green-50 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-700 font-medium">Agent 在线</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-3 space-y-2.5">
          <a
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white rounded-full px-6 py-3 font-medium hover:bg-gray-800 transition-colors"
          >
            进入世界
            <span>&rarr;</span>
          </a>
          <a
            href="/api/auth/logout"
            className="flex items-center justify-center w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-1.5"
          >
            退出登录
          </a>
        </div>
      </div>
    </div>
  );
}
