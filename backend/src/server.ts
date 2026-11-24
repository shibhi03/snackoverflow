import { createApp } from "./app.js"
import { config } from "./config/env.js"

const app = createApp()

app.listen(config.port, "0.0.0.0", () => {
  console.info(
    `[Snack Overflow API] Running on port ${config.port} in ${config.nodeEnv} mode`,
  )
})
