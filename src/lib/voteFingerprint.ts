// Lightweight per-browser fingerprint for vote deduplication.
// Stored in localStorage so each visitor gets a stable id without tracking SDKs.
const KEY = "rh_voter_fp";

export const getVoterFingerprint = (): string => {
  try {
    let fp = localStorage.getItem(KEY);
    if (!fp) {
      fp = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(KEY, fp);
    }
    return fp;
  } catch {
    return `v_anon_${Math.random().toString(36).slice(2, 10)}`;
  }
};

const VOTED_KEY = "rh_voted_ids";

export const getVotedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

export const markVotedLocally = (id: string) => {
  try {
    const ids = getVotedIds();
    ids.add(id);
    localStorage.setItem(VOTED_KEY, JSON.stringify([...ids]));
  } catch {}
};
