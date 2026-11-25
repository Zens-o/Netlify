# Daymark push reminder setup

The frontend and Netlify reminder functions are prepared in this project. Push reminders become live after Netlify deploys the functions and the VAPID environment variables are set.

## 1. Connect this project to the existing Netlify site

The current site was published as a static drag-and-drop deploy. That method does not publish serverless functions. Put this entire project folder in a GitHub repository, then connect that repository to the existing `loganslife` Netlify project. Netlify should use the settings in `netlify.toml` (`dist` for the published site and `netlify/functions` for functions).

Alternatively, from this project folder, install Node.js and the Netlify CLI, link the existing site, install dependencies, and deploy from the project root:

```powershell
npm install
npm install --global netlify-cli
netlify link
netlify deploy --prod
```

Choose the existing `loganslife` site when `netlify link` asks. Deploy from the project root; do not upload only the `dist` folder.

## 2. Create VAPID keys

From the project folder, run:

```powershell
npx web-push generate-vapid-keys --json
```

Important: enter the full long key values printed after `publicKey` and `privateKey`. Do not type the words `publicKey` or `privateKey` as the values. Keep the private key private. Do not commit it or paste it into the app's HTML.

## 3. Add Netlify environment variables

In Netlify, open the `loganslife` project and go to **Project configuration → Environment variables**. Add these values, then trigger a new production deploy:

| Variable | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | `publicKey` from the generated output |
| `VAPID_PRIVATE_KEY` | `privateKey` from the generated output |
| `VAPID_SUBJECT` | `mailto:your-email@example.com` using your email |

The private key is stored only as a Netlify environment variable. The public key is returned to the app by the `push-config` function.

## 4. Turn reminders on in Daymark

Open the published site on the phone, install Daymark to the home screen if prompted, and tap the reminder bell. Allow notifications. Scheduled priorities already on that device will sync, and newly created or completed priorities will update the reminder schedule automatically.

Netlify checks for due reminders once a minute, so delivery may be about a minute after the scheduled time. The browser must support push, and the user must allow notifications. Tasks and push subscription details are stored in Netlify Blobs for that device; this prototype does not sync tasks between devices or have user accounts.