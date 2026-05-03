import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function useData() {
  const [me, setMe] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getMe(), api.getGroups()])
      .then(([meData, groupsData]) => {
        setMe(meData);
        setGroups(groupsData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { me, groups, loading, error };
}
