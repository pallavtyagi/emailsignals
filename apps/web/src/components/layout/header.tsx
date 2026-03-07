'use client';

const hasValidClerkKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_');

function ClerkHeader() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { UserButton, OrganizationSwitcher } = require('@clerk/nextjs');
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center gap-4">
        <OrganizationSwitcher
          afterCreateOrganizationUrl="/dashboard"
          afterLeaveOrganizationUrl="/dashboard"
          afterSelectOrganizationUrl="/dashboard"
        />
      </div>
      <div className="flex items-center gap-4">
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}

function PlaceholderHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">SignalWave</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground">Dev Mode (no auth)</span>
      </div>
    </header>
  );
}

export function Header() {
  return hasValidClerkKey ? <ClerkHeader /> : <PlaceholderHeader />;
}
