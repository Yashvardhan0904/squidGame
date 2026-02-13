import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request) {
  try {
    const { contestUrl, csvUrl } = await request.json();
    
    // Path to Python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'daily_processor.py');
    
    // Prepare arguments for Python script
    const args = [];
    if (contestUrl) args.push('--contest-url', contestUrl);
    if (csvUrl) args.push('--csv-url', csvUrl);
    
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [scriptPath, ...args]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`Python stdout: ${data}`);
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`Python stderr: ${data}`);
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(NextResponse.json({ 
            success: true, 
            message: 'Arena synced successfully',
            output: stdout 
          }));
        } else {
          resolve(NextResponse.json({ 
            success: false, 
            error: `Python script failed with code ${code}`,
            details: stderr || stdout
          }, { status: 500 }));
        }
      });
      
      pythonProcess.on('error', (error) => {
        resolve(NextResponse.json({ 
          success: false, 
          error: 'Failed to execute Python script',
          details: error.message
        }, { status: 500 }));
      });
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Sync failed',
      details: error.message
    }, { status: 500 });
  }
}
