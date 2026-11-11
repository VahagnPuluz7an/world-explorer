// Data layer: Supabase when configured, otherwise localStorage ("local mode").
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloud = Boolean(URL && KEY && !URL.includes('YOUR_'));
const sb = cloud ? createClient(URL, KEY) : null;

// ---------- local fallback ----------
const ls = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
async function hash(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function currentUser() {
  if (cloud) {
    const { data } = await sb.auth.getSession();
    const u = data.session?.user;
    return u ? { id: u.id, email: u.email, name: u.user_metadata?.name || u.email.split('@')[0] } : null;
  }
  return ls.get('we_session', null);
}

export async function signUp(email, password, name) {
  if (cloud) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: location.origin } });
    if (error) throw error;
    if (!data.session) return { needsConfirm: true };
    return { user: await currentUser() };
  }
  const users = ls.get('we_users', {});
  if (users[email]) throw new Error('Такой email уже зарегистрирован');
  const user = { id: crypto.randomUUID(), email, name: name || email.split('@')[0] };
  users[email] = { ...user, pass: await hash(password) };
  ls.set('we_users', users); ls.set('we_session', user);
  return { user };
}

export async function signIn(email, password) {
  if (cloud) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Неверный email или пароль' : error.message);
    return currentUser();
  }
  const u = ls.get('we_users', {})[email];
  if (!u || u.pass !== (await hash(password))) throw new Error('Неверный email или пароль');
  const user = { id: u.id, email: u.email, name: u.name };
  ls.set('we_session', user);
  return user;
}

export async function signOut() {
  if (cloud) await sb.auth.signOut();
  else localStorage.removeItem('we_session');
}

// mark = { id, kind: 'stroke'|'area'|'country', color, opacity, size, zoom, data, label, created_at }
export async function loadMarks(userId) {
  if (cloud) {
    const { data, error } = await sb.from('marks').select('*').order('created_at');
    if (error) throw error;
    return data;
  }
  return ls.get('we_marks_' + userId, []);
}

export async function saveMark(userId, mark) {
  if (cloud) {
    const { error } = await sb.from('marks').insert({ ...mark, user_id: userId });
    if (error) throw error;
    return;
  }
  const all = ls.get('we_marks_' + userId, []); all.push(mark); ls.set('we_marks_' + userId, all);
}

export async function deleteMark(userId, id) {
  if (cloud) {
    const { error } = await sb.from('marks').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  ls.set('we_marks_' + userId, ls.get('we_marks_' + userId, []).filter((m) => m.id !== id));
}
