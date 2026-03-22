(async () => {
    const contestSlug = "okay-1774198667";
    const batchSize = 100;
    let offset = 0;
    let allParticipants = [];
    let hasMore = true;

    // 1. Helper function to pause execution and avoid rate limits
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // 2. Helper function to safely escape CSV values
    const escapeCSV = (value) => {
        if (value === null || value === undefined) return '""';
        const str = String(value);
        return str.includes(',') || str.includes('"') || str.includes('\n') 
            ? `"${str.replace(/"/g, '""')}"` 
            : str;
    };

    console.log("%c Starting Full Leaderboard Export... ", "background: #222; color: #bada55");

    while (hasMore) {
        const url = `https://www.hackerrank.com/rest/contests/${contestSlug}/leaderboard?offset=${offset}&limit=${batchSize}`;
        
        try {
            const response = await fetch(url);
            
            // 3. Handle Rate Limiting gracefully
            if (!response.ok) {
                if (response.status === 429) {
                    console.warn(`Rate limited at offset ${offset}. Waiting 5 seconds to retry...`);
                    await sleep(5000);
                    continue; // Retry the same offset
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const participants = data.models;

            if (participants && participants.length > 0) {
                allParticipants = allParticipants.concat(participants);
                console.log(`Fetched ranks ${offset + 1} to ${offset + participants.length}`);
                offset += batchSize;
                
                // If we got fewer than the batch size, we hit the end
                if (participants.length < batchSize) {
                    hasMore = false;
                } else {
                    // 4. Mandatory delay between successful requests to keep the server happy
                    await sleep(1000); 
                }
            } else {
                hasMore = false;
            }
        } catch (err) {
            console.error(`Batch fetch failed at offset ${offset}:`, err);
            hasMore = false; // End the loop if a fatal error occurs
        }
    }

    if (allParticipants.length > 0) {
        const headers = ["Rank", "Hacker", "Score", "Time"];
        const csvRows = [headers.join(",")];
        
        allParticipants.forEach(p => {
            // 5. Safely extract and escape values. Handled fallbacks for 'time' property variations.
            const rank = escapeCSV(p.rank);
            const hacker = escapeCSV(p.hacker);
            const score = escapeCSV(p.score);
            const time = escapeCSV(p.time_taken || p.timeconsumed || p.time || ""); 
            
            csvRows.push([rank, hacker, score, time].join(","));
        });

        // 6. Cross-browser compatible download execution
        const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `full_leaderboard_${contestSlug}.csv`;
        
        document.body.appendChild(link); // Required for Firefox support
        link.click();
        document.body.removeChild(link); // Clean up the DOM
        
        console.log(`%c Done! Exported ${allParticipants.length} total participants. `, "background: #222; color: #00ff00");
    } else {
        console.log("%c No participants found or fetch failed completely. ", "background: #222; color: #ff0000");
    }
})();