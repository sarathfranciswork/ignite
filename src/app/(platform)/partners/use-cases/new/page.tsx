import { UseCaseForm } from "@/components/useCases/UseCaseForm";

export default function NewUseCasePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <UseCaseForm mode="create" />
    </div>
  );
}
