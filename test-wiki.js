const placeName = "Gateway of India";
const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(placeName)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url&format=json&origin=*`;

fetch(url)
  .then(res => res.json())
  .then(data => {
      console.log('Got response!');
      if (data && data.query && data.query.pages) {
          const pages = Object.values(data.query.pages);
          const urls = pages
              .map(page => page.imageinfo?.[0]?.url)
              .filter(url => url && url.match(/\.(jpeg|jpg|gif|png)$/i));
          console.log(`Found ${urls.length} images for ${placeName}`);
          urls.slice(0, 3).forEach(u => console.log(u));
      } else {
          console.log('No pages found');
      }
  })
  .catch(console.error);
