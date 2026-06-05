import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  return (
    <div>
      <h1>Dashboard</h1>
      <button>Create new item</button>
      <button>Log out</button>
    </div>
  );
}
