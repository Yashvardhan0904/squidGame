#!/usr/bin/env python3
"""
ACM Squid Game - Daily Score Processor
Syncs daily contest results with Firestore database
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime
from urllib.request import urlopen
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin SDK
def init_firebase():
    """Initialize Firebase Admin SDK with credentials"""
    try:
        # Try to get credentials from environment variable
        cred_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
        
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
        else:
            # Try to use application default credentials
            cred = credentials.ApplicationDefault()
        
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        
        return firestore.client()
    except Exception as e:
        print(f"Error initializing Firebase: {e}", file=sys.stderr)
        sys.exit(1)

def generate_contest_url():
    """Generate today's contest URL based on date pattern"""
    today = datetime.now()
    date_str = today.strftime('%d%m%Y')  # ddmmyyyy format
    return f"https://www.hackerrank.com/acmsquidgame{date_str}"

def fetch_csv_data(csv_url):
    """Fetch and parse CSV data from URL"""
    try:
        print(f"Fetching CSV from: {csv_url}")
        response = urlopen(csv_url)
        csv_data = response.read().decode('utf-8')
        
        # Parse CSV
        reader = csv.DictReader(csv_data.splitlines())
        scores = {}
        
        for row in reader:
            # Assuming CSV has columns: hackerrank_id, score
            # Adjust field names based on actual CSV structure
            hr_id = row.get('hackerrank_id') or row.get('username') or row.get('id')
            score = int(row.get('score', 0) or row.get('total_score', 0) or 0)
            
            if hr_id:
                scores[hr_id] = score
        
        print(f"Parsed {len(scores)} player scores from CSV")
        return scores
    except Exception as e:
        print(f"Error fetching CSV: {e}", file=sys.stderr)
        return {}

def process_daily_scores(db, csv_scores):
    """Process daily scores and update Firestore"""
    collection_ref = db.collection('artifacts').document('acm-squid-arena').collection('public').document('data').collection('players')
    
    # Fetch all players
    players_ref = collection_ref.stream()
    players = {doc.id: doc for doc in players_ref}
    
    print(f"Processing {len(players)} players...")
    
    batch = db.batch()
    batch_count = 0
    updates_count = 0
    
    for player_id, player_doc in players.items():
        player_data = player_doc.to_dict()
        
        # Skip already eliminated players
        if player_data.get('eliminated', False):
            continue
        
        # Get today's score (0 if not in CSV)
        today_score = csv_scores.get(player_id, 0)
        
        # Update previous_scores array
        previous_scores = player_data.get('previous_scores', [])
        updated_scores = previous_scores + [today_score]
        
        # Keep only last 3 scores
        updated_scores = updated_scores[-3:]
        
        # Check if eliminated (all 3 scores are 0)
        eliminated = len(updated_scores) == 3 and all(s == 0 for s in updated_scores)
        
        # Update total score
        total_score = player_data.get('totalScore', 0) + today_score
        
        # Prepare update
        update_data = {
            'previous_scores': updated_scores,
            'totalScore': total_score,
            'eliminated': eliminated,
            'last_updated': firestore.SERVER_TIMESTAMP
        }
        
        batch.update(player_doc.reference, update_data)
        batch_count += 1
        updates_count += 1
        
        # Commit batch every 400 updates (Firestore limit is 500)
        if batch_count >= 400:
            batch.commit()
            print(f"Committed batch of {batch_count} updates")
            batch = db.batch()
            batch_count = 0
    
    # Commit remaining updates
    if batch_count > 0:
        batch.commit()
        print(f"Committed final batch of {batch_count} updates")
    
    print(f"✓ Successfully updated {updates_count} players")
    return updates_count

def add_new_players(db, csv_scores):
    """Add new players found in CSV but not in database"""
    collection_ref = db.collection('artifacts').document('acm-squid-arena').collection('public').document('data').collection('players')
    
    # Get existing player IDs
    existing_players = {doc.id for doc in collection_ref.stream()}
    
    # Find new players
    new_players = set(csv_scores.keys()) - existing_players
    
    if not new_players:
        print("No new players to add")
        return 0
    
    print(f"Adding {len(new_players)} new players...")
    
    batch = db.batch()
    batch_count = 0
    
    for player_id in new_players:
        score = csv_scores[player_id]
        
        player_data = {
            'name': player_id,  # Default name, should be updated manually
            'hackerrank_id': player_id,
            'enroll_no': 'NEW',
            'previous_scores': [score],
            'totalScore': score,
            'eliminated': False,
            'last_updated': firestore.SERVER_TIMESTAMP
        }
        
        doc_ref = collection_ref.document(player_id)
        batch.set(doc_ref, player_data)
        batch_count += 1
        
        if batch_count >= 400:
            batch.commit()
            batch = db.batch()
            batch_count = 0
    
    if batch_count > 0:
        batch.commit()
    
    print(f"✓ Added {len(new_players)} new players")
    return len(new_players)

def main():
    parser = argparse.ArgumentParser(description='Process daily ACM Squid Game scores')
    parser.add_argument('--contest-url', help='Custom HackerRank contest URL')
    parser.add_argument('--csv-url', help='Direct CSV URL')
    
    args = parser.parse_args()
    
    # Initialize Firebase
    db = init_firebase()
    print("✓ Firebase initialized")
    
    # Determine CSV URL
    if args.csv_url:
        csv_url = args.csv_url
    else:
        # If no CSV URL provided, we need to scrape from contest URL
        contest_url = args.contest_url or generate_contest_url()
        print(f"Contest URL: {contest_url}")
        print("WARNING: Direct contest scraping not implemented. Please provide --csv-url")
        sys.exit(1)
    
    # Fetch CSV data
    csv_scores = fetch_csv_data(csv_url)
    
    if not csv_scores:
        print("ERROR: No scores found in CSV", file=sys.stderr)
        sys.exit(1)
    
    # Add new players
    new_count = add_new_players(db, csv_scores)
    
    # Process daily scores
    update_count = process_daily_scores(db, csv_scores)
    
    print(f"\n✓ Sync complete!")
    print(f"  - New players added: {new_count}")
    print(f"  - Players updated: {update_count}")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
