export function CorporateModule() {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Corporate Accounts</h3>
        <p className="text-sm text-text-muted">
          Corporate workflows are intentionally read-only in this hardening phase. The next iteration can add managed account
          CRUD once role-based server workflows are in place.
        </p>
      </div>
    </div>
  );
}
