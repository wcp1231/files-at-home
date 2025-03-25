import Link from "next/link";
import { useTranslations } from 'next-intl';
import { DynamicIcon } from "lucide-react/dynamic";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'FolderPort - Fast & Secure Folder Sharing',
  description: 'Share folders quickly and securely from anywhere. Support large file transfers, preview files online, and encrypt your data. No registration required.',
  alternates: {
    canonical: '/'
  },
}

export default function Home() {
  const t = useTranslations('HomePage');

  const features = [
    {
      icon: "monitor",
      title: t('features.oneClick.title'),
      description: t('features.oneClick.description')
    },
    {
      icon: "image",
      title: t('features.preview.title'),
      description: t('features.preview.description')
    },
    {
      icon: "download",
      title: t('features.unlimited.title'),
      description: t('features.unlimited.description')
    },
    {
      icon: "lock",
      title: t('features.security.title'),
      description: t('features.security.description')
    },
    {
      icon: "smartphone",
      title: t('features.crossPlatform.title'),
      description: t('features.crossPlatform.description')
    },
    {
      icon: 'arrow-right-left',
      title: t('features.dualShare.title'),
      description: t('features.dualShare.description')
    },
  ] as const;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-16 sm:p-20 sm:pb-0">
      <main className="flex flex-col gap-12 items-center max-w-5xl text-center">
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

        <div className="w-full">
          <h2 className="text-2xl font-bold mb-8">{t('features.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="rounded-lg border bg-card p-6 hover:border-foreground/40 transition-all hover:shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2 rounded-full bg-primary/10">
                    <DynamicIcon name={feature.icon} className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="w-full max-w-5xl mx-auto">
        <div className="border-t py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('footer.product.documentation')}
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link href="mailto:contact@folderport.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('footer.support.contact')}
            </Link>
          </div>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
