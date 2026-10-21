import { defineApp } from 'convex/server';
import resend from '@convex-dev/resend/convex.config';
import betterAuth from './betterAuth/convex.config';
import migrations from '@convex-dev/migrations/convex.config.js';
import comments from '@hamzasaleemorg/convex-comments/convex.config.js';
import rag from '@convex-dev/rag/convex.config';
import r2 from '@convex-dev/r2/convex.config.js';

const app = defineApp();
app.use(resend);
app.use(betterAuth);
app.use(migrations);
app.use(comments);
app.use(rag);
app.use(r2);

export default app;
