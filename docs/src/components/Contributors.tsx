import React, { useEffect, useState } from 'react';

export default function Contributors() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch('https://api.github.com/repos/kasimlyee/dotenv-gad/contributors')
      .then(res => res.json())
      .then(setUsers)
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {users.map(user => (
        <a
          key={user.id}
          href={user.html_url}
          target="_blank"
          rel="noopener noreferrer"
          title={user.login}
        >
          <img
            src={user.avatar_url}
            width={48}
            height={48}
            style={{ borderRadius: '50%' }}
          />
        </a>
      ))}
    </div>
  );
}
