import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://folderport.com',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    // 看起来建议是不要索引 share 页面
    // {
    //   url: 'https://folderport.com/share',
    //   lastModified: new Date(),
    //   changeFrequency: 'always',
    //   priority: 0.8,
    // },
    {
      url: 'https://folderport.com/access',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // {
    //   url: 'https://folderport.com/docs',
    //   lastModified: new Date(),
    //   changeFrequency: 'weekly',
    //   priority: 0.7,
    // },
    // {
    //   url: 'https://folderport.com/contact',
    //   lastModified: new Date(),
    //   changeFrequency: 'monthly',
    //   priority: 0.5,
    // },
  ]
} 