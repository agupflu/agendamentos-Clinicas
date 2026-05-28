import { createAdminClient } from "@/lib/supabase";
import QuizFlow from "@/components/calendario/quiz-flow";
import type { CsConfig } from "@/types";

export const dynamic = "force-dynamic";

async function getConfig(): Promise<CsConfig | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("cs_config").select("*").limit(1).single();
    return (data as CsConfig) ?? null;
  } catch { return null; }
}

export default async function AgendarPage() {
  const config = await getConfig();
  return <QuizFlow config={config} />;
}
