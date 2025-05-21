import { PGlite } from "@electric-sql/pglite";


let db;
const DB_NAME = 'patient_registration_db';
const PATIENTS_TABLE = 'patients';


async function initializeDatabase(){
    try{
        db = new PGlite(`idb://${DB_NAME}`);
        await db.waitReady;


        await db.exec(`
            CREATE TABLE IF NOT EXISTS ${PATIENTS_TABLE} (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                date_of_birth DATE NOT NULL,
                contact_number TEXT NOT NULL,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                gender TEXT NOT NULL
            )
        `);

        return true;
    } catch (error){
        console.error('Error initializing database:', error);
        return false;
    }
}

function showSection(sectionId){
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
        if(link.getAttribute('data-section') === sectionId){
            link.classList.add('active');
        }
    });

    if(sectionId === 'patient-list'){
        loadPatients();
    }
}

async function loadPatients(){
}

async function loadPatients(){
    const patients = await db.select(`SELECT * FROM ${PATIENTS_TABLE}`);
    const patientListSection = document.getElementById('patient-list');
    
}


// intialize the application

document.addEventListener('DOMContentLoaded', async () => {

    const dbInitialized = await initializeDatabase();
    if(!dbInitialized){
        alert('Failed to initialize the database. Please try again.');
        return;
    }

    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            showSection(sectionId);
        });
    });

})    
    
    
