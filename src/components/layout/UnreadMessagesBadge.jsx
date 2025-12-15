import React from 'react';
import { useUser } from '../auth/UserProvider';

export default function UnreadMessagesBadge({ className }) {
    const { unreadMessagesCount } = useUser();

    if (unreadMessagesCount === 0) return null;

    const defaultClassName = "ml-auto h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center";

    return (
        <span
            className={className || defaultClassName}
            style={{ backgroundColor: '#f26222', color: '#e5e4cd' }}
        >
            {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
        </span>
    );
}