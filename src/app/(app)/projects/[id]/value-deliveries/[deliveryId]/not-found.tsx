import Link from "next/link";
import { ErrorState } from "@/ui/feedback/ErrorState";

export default function ValueDeliveryNotFound() {
  return (
    <ErrorState
      title="Entrega de valor não encontrada"
      message="Esta entrega não existe neste projeto ou não está mais disponível."
      action={
        <Link href="/projects" className="text-label-md font-semibold text-primary underline">
          Voltar aos projetos
        </Link>
      }
    />
  );
}
