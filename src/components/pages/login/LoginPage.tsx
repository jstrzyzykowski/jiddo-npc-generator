import { MagicLinkForm } from "./MagicLinkForm";

export function LoginPage() {
  return (
    <section className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <MagicLinkForm />
      </div>
    </section>
  );
}
