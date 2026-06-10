import { env } from './config/env';
import app from './app';
import * as therapyEmbeddingStorage from './modules/ai/therapyEmbeddingStorage';

app.listen(env.PORT, () => {
  console.log(`HelixCareAI API listening on port ${env.PORT}`);
  therapyEmbeddingStorage
    .syncAllMissingSessionEmbeddings()
    .then((r) => {
      if (r.synced > 0) {
        console.log(
          `[AI] Startup sync: indexed ${r.synced} session(s) across ${r.children} child(ren) (${r.skipped} skipped)`
        );
      }
    })
    .catch((err) => console.error('[AI] Startup sync failed:', err));
});
