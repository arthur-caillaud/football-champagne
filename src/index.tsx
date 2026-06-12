import { render } from "ink";
import { App } from "./App";

const missing = ["OPENAI_API_KEY", "FOOTBALL_DATA_API_KEY"].filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Variable(s) d'environnement manquante(s) : ${missing.join(", ")} (voir .env.example)`);
  process.exit(1);
}

render(<App footballDataApiKey={process.env.FOOTBALL_DATA_API_KEY ?? ""} />);
