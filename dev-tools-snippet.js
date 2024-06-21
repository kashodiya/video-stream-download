async function downloadVideo(m3u8Url, vid) {
    try {
        // Step 1: Fetch the .m3u8 playlist
        const response = await fetch(m3u8Url);
        if (!response.ok) {
            throw new Error('Failed to fetch .m3u8 playlist');
        }
        const playlistText = await response.text();

        // Step 2: Parse the playlist to get the segment URLs
        const segmentUrls = playlistText.split('\n')
                                       .filter(line => line.trim().length > 0 && !line.startsWith('#'))
                                       .map(line => new URL(line, m3u8Url).href);

        // Step 3: Download each segment
        // let segments = [];
        // for (let i = 0; i < segmentUrls.length; i++) {
        //     const segmentUrl = segmentUrls[i];
        //     const segmentResponse = await fetch(segmentUrl);
        //     if (!segmentResponse.ok) {
        //         throw new Error(`Failed to download segment ${segmentUrl}`);
        //     }
        //     const segmentBlob = await segmentResponse.blob();
        //     segments.push(segmentBlob);
        //     console.log('Got blob');
        // }
        // const combinedBlob = new Blob(segments, { type: segments[0].type });

        fetchSegmentsInParallel(segmentUrls)
            .then(combinedBlob1 => {
                //console.log('Combined Blob:', combinedBlob);
                // Further processing or usage of combinedBlob
                triggerDownload(combinedBlob1, vid);
            })
            .catch(error => {
                console.error('Error fetching segments:', error);
            });
        

    } catch (error) {
        console.error('Error downloading video:', error);
    }
}

function triggerDownload(combinedBlob, vid) {
        const blobUrl = URL.createObjectURL(combinedBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = vid + '.mp4'; // Specify the file name here
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);

        console.log('Video download complete');        
}

async function fetchSegmentsInParallel(segmentUrls) {
    const segments = [];

    // Define the maximum number of concurrent fetch operations
    const maxConcurrency = 400;

    // Function to fetch a segment and add to segments array
    async function fetchAndStoreSegment(segmentUrl) {
        const response = await fetch(segmentUrl);
        if (!response.ok) {
            console.log(`Failed to download segment ${segmentUrl}`);
            // throw new Error(`Failed to download segment ${segmentUrl}`);
        }else{
            console.log('Got blob');
        }
        return response.blob();
    }

    // Array to hold promises for fetch operations
    const fetchPromises = [];

    // Loop through segmentUrls and initiate fetch requests
    for (let i = 0; i < segmentUrls.length; i++) {
        const segmentUrl = segmentUrls[i];
        fetchPromises.push(fetchAndStoreSegment(segmentUrl));

        // If reached maxConcurrency or end of segmentUrls, wait for ongoing fetches
        if (fetchPromises.length === maxConcurrency || i === segmentUrls.length - 1) {
            // Wait for all promises to resolve for the current batch
            const batchSegments = await Promise.all(fetchPromises);
            segments.push(...batchSegments);
            
            // Clear the array for the next batch of promises
            fetchPromises.length = 0;
        }
    }

    // Create the combined Blob from all fetched segments
    const combinedBlob = new Blob(segments, { type: segments[0].type });
    return combinedBlob;
}

const vid = '78'
const reso = '144'
const m3u8Url = 'https://d3tmpkeblprigv.cloudfront.net/AshtavakraGeeta-Talk'+ vid + '/' + reso + 'p.m3u8';
downloadVideo(m3u8Url, vid);

