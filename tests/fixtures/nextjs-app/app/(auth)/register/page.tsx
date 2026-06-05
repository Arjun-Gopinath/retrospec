export default function RegisterPage() {
  return (
    <form>
      <h1>Create account</h1>
      <input name="name" type="text" placeholder="Full name" required />
      <input name="email" type="email" placeholder="Email address" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Create account</button>
    </form>
  );
}
