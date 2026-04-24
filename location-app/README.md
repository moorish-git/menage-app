# Location App — Site de location avec réservations et cautions Stripe

Site Next.js + Supabase + Stripe qui permet à un hôte de mettre en avant ses logements et à des voyageurs de réserver et de payer en ligne, avec une **caution pré-autorisée sur carte** (non débitée sauf en cas de dégâts).

Ce projet vit dans `menage-app/location-app/` à côté de l'application `menage-app` existante. Les deux sont indépendants.

---

## 🚀 Démarrer en 7 étapes

### 1) Installer les dépendances

```bash
cd location-app
npm install
```

### 2) Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com/) → **New project**
2. Choisissez un nom (ex. `location-app`) et un mot de passe fort
3. Une fois le projet prêt, notez dans **Settings → API** :
   - `Project URL`
   - `anon public` key
   - `service_role` key (⚠️ à garder **secrète** — n'apparaît jamais côté client)

### 3) Exécuter la migration SQL

Dans Supabase → **SQL Editor** → **New query** → collez le contenu de
`supabase/migrations/001_init.sql` → **Run**.

Vérifiez ensuite dans **Table Editor** que les tables `profiles`, `properties`, `property_photos`, `bookings` sont présentes.

### 4) Créer le bucket de photos

Dans Supabase → **Storage** → **Create a new bucket**
- Nom : `property-photos`
- **Public bucket** : ✅ activé

### 5) Créer un compte Stripe (Test)

1. Allez sur [stripe.com](https://stripe.com/) → créer un compte
2. Assurez-vous d'être en mode **Test** (toggle en haut à droite du dashboard)
3. **Developers → API keys** : notez les deux clés `sk_test_...` et `pk_test_...`

### 6) Remplir `.env.local`

Copiez le modèle et remplissez-le avec vos clés :

```bash
cp .env.local.example .env.local
```

Ouvrez `.env.local` et collez vos clés :

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=          # rempli à l'étape suivante
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 7) Configurer le webhook Stripe (local)

Installez la [Stripe CLI](https://stripe.com/docs/stripe-cli), puis dans un terminal séparé :

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

La commande affiche une ligne du type :
```
Ready! Your webhook signing secret is whsec_xxxxx
```
Copiez ce `whsec_...` dans `STRIPE_WEBHOOK_SECRET` de votre `.env.local`.

**Laissez ce terminal ouvert** pendant vos tests — c'est lui qui relaie les événements Stripe vers votre serveur local.

---

## ▶️ Lancer l'app

Dans un 3e terminal :
```bash
npm run dev
```
Le site est sur [http://localhost:3000](http://localhost:3000).

## 👤 Passer votre compte en "hôte"

Par défaut, tout nouveau compte créé a le rôle `guest`. Pour voir le dashboard hôte :

1. Créez un compte via `/signup` (confirmez l'email)
2. Dans Supabase → **Table Editor → profiles**
3. Trouvez votre ligne et passez `role` de `guest` à `host`
4. Rechargez le site — le menu "Dashboard" apparaît

---

## 🧪 Tester un parcours complet

1. En tant qu'hôte : **Dashboard → Ajouter un logement** (avec photos, prix, caution 300 € par exemple). Cochez "Publier".
2. Déconnectez-vous, recréez un compte voyageur (autre email).
3. Sur la home, cliquez sur le logement, choisissez des dates et réservez.
4. Sur l'écran Stripe Checkout, utilisez la carte test : **`4242 4242 4242 4242`**, date future, CVC libre.
5. Vous revenez sur la page de succès. Dans Supabase, la `booking` passe à `confirmed`.
6. Reconnectez-vous en tant qu'hôte → **Réservations** → cliquez **"Demander la caution"**. Un lien s'affiche à transmettre au client.
7. Reconnectez-vous en tant que voyageur → ouvrez le lien → saisissez **`4242 4242 4242 4242`** → la caution passe à **`authorized`**.
8. Côté hôte, vous pouvez alors **Libérer** ou **Prélever un montant**.

### Cartes de test utiles

| Carte | Comportement |
|---|---|
| `4242 4242 4242 4242` | Paiement réussi |
| `4000 0000 0000 0002` | Paiement refusé |
| `4000 0025 0000 3155` | 3D Secure requis |

## ⚠️ Points d'attention

- Tous les montants sont en **centimes** (50 € = `5000`).
- La **service role key** Supabase n'est utilisée que côté serveur (`src/lib/supabase/admin.js`) pour les webhooks. Elle ne doit **jamais** apparaître dans le navigateur.
- La RLS est activée sur toutes les tables. Testez régulièrement sans être connecté.
- Une autorisation Stripe dure **7 jours par défaut**. Pour des séjours longs, pré-autorisez la caution 5 jours avant l'arrivée plutôt qu'à la réservation.

## 🚢 Déployer sur Vercel

1. Poussez le code sur un repo GitHub
2. Sur [vercel.com](https://vercel.com/) → **Import project** → sélectionnez le repo
3. **Root directory** : `location-app`
4. Ajoutez toutes les variables d'env de `.env.local` (en version prod : `pk_live_...`, `sk_live_...` seulement quand vous êtes prêt)
5. Après le premier déploiement, dans Stripe Dashboard → **Developers → Webhooks → Add endpoint** :
   - URL : `https://votre-domaine.vercel.app/api/webhooks/stripe`
   - Events : `checkout.session.completed`, `checkout.session.expired`, `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.canceled`
   - Copiez le nouveau `whsec_...` dans les variables d'env Vercel et redéployez

## 📂 Structure

```
location-app/
├── src/
│   ├── app/
│   │   ├── page.js                     # home (liste des logements)
│   │   ├── properties/[id]/            # page détail + réservation
│   │   ├── login/, signup/, auth/callback/
│   │   ├── bookings/                   # success, cancel, [id]/deposit
│   │   ├── account/bookings/           # mes réservations
│   │   ├── admin/                      # dashboard hôte (properties, bookings)
│   │   └── api/
│   │       ├── checkout/               # crée la session Stripe
│   │       ├── webhooks/stripe/        # reçoit les événements Stripe
│   │       └── deposits/               # authorize, capture, release
│   ├── components/                     # PhotoGallery, BookingForm, etc.
│   ├── lib/
│   │   ├── supabase/                   # clients browser/server/admin
│   │   ├── stripe.js, format.js, photos.js
│   └── middleware.js                   # protège /admin, /account, /bookings
├── supabase/migrations/001_init.sql
├── tailwind.config.js, next.config.mjs
└── package.json
```
