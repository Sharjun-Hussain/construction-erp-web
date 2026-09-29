export default function Home() {
  return (
    <div>
      <h1>Qulf Construction QS ERP</h1>
      <p>Multi-tenant backend: Express + MySQL (organization_id). Frontend: Next.js.</p>
      <ol>
        <li>Start backend: POST /api/v1/auth/register-org</li>
        <li>Login at /login, token stored in localStorage</li>
        <li>Manage /projects (Phase 1: Projects, BOQ, Estimation, IPC)</li>
      </ol>
    </div>
  );
}
