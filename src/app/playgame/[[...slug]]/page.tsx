import { redirect } from 'next/navigation';

type PlayGameAliasPageProps = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlayGameAliasPage({ params, searchParams }: PlayGameAliasPageProps) {
  const [{ slug = [] }, query] = await Promise.all([params, searchParams]);
  const targetPath = `/playmanager${slug.length > 0 ? `/${slug.join('/')}` : ''}`;
  const urlSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) urlSearchParams.append(key, item);
    } else if (typeof value === 'string') {
      urlSearchParams.set(key, value);
    }
  }

  const queryString = urlSearchParams.toString();
  redirect(queryString ? `${targetPath}?${queryString}` : targetPath);
}
