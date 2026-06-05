export default function LoginPage() {
  return (
    <form>
      <h1>Sign in</h1>
      <input name="email" type="email" placeholder="Email address" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Sign in</button>
      <a href="/register">Create account</a>
    </form>
  );
}
