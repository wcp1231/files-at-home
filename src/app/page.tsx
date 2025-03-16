import Link from "next/link";
import {useTranslations} from 'next-intl';
import { DynamicIcon } from "lucide-react/dynamic";

export default function Home() {
  const t = useTranslations('HomePage');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-12 items-center max-w-3xl text-center">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            {t('title')}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t('description')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          <Link
            className="group relative rounded-lg border p-6 hover:border-foreground/40 transition-colors"
            href="/share"
          >
            <div className="flex items-center gap-4">
              <DynamicIcon name="share-2" className="h-6 w-6" />
              <h3 className="font-semibold">{t('actions.share.title')}</h3>
            </div>
            <p className="mt-3 text-muted-foreground text-sm text-left">
              {t('actions.share.description')}
            </p>
          </Link>

          <Link
            className="group relative rounded-lg border p-6 hover:border-foreground/40 transition-colors"
            href="/access"
          >
            <div className="flex items-center gap-4">
              <DynamicIcon name="download" className="h-6 w-6" />
              <h3 className="font-semibold">{t('actions.access.title')}</h3>
            </div>
            <p className="mt-3 text-muted-foreground text-sm text-left">
              {t('actions.access.description')}
            </p>
          </Link>
        </div>

        <div className="rounded-lg border bg-card p-8 w-full">
          <div className="flex items-center gap-4 mb-4">
            <DynamicIcon name="laptop" className="h-6 w-6" />
            <h3 className="font-semibold">{t('features.title')}</h3>
          </div>
          <ul className="grid gap-4 text-sm text-muted-foreground text-left list-disc list-inside">
            <li>{t('features.features.0')}</li>
            <li>{t('features.features.1')}</li>
            <li>{t('features.features.2')}</li>
            <li>{t('features.features.3')}</li>
            <li>{t('features.features.4')}</li>
            <li>{t('features.features.5')}</li>
          </ul>
        </div>
      </main>

      <footer className="flex gap-6 flex-wrap items-center justify-center text-sm text-muted-foreground">
        <a
          className="hover:text-foreground transition-colors"
          href="#"
        >
          {t('footer.documentation')}
        </a>
        <span>·</span>
        <a
          className="hover:text-foreground transition-colors"
          href="#"
        >
          {t('footer.about')}
        </a>
      </footer>
    </div>
  );
}
