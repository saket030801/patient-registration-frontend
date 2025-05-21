import { PGlite } from "@electric-sql/pglite";

let db;
const DB_NAME = 'patient_registration_db';
const PATIENTS_TABLE = 'patients';

// Browser-compatible UUID generation function
function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

async function initializeDatabase(){
    try{
        db = new PGlite(`idb://${DB_NAME}`);
        await db.waitReady;

        await db.exec(`
            CREATE TABLE IF NOT EXISTS ${PATIENTS_TABLE} (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                date_of_birth DATE NOT NULL,
                contact_phone TEXT,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    const tableBody = document.getElementById('patient-table-body');
    
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

    const result = await getAllPatients();

    if(result.success){
        if(result.patients.length === 0){
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No patients found</td></tr>';
            return;
        }

        tableBody.innerHTML = '';

        result.patients.forEach(patient => {
            const row = document.createElement('tr');
            const dob = new Date(patient.date_of_birth);
            const formattedDob = dob.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            row.innerHTML = `
                <td>${patient.id}</td>
                <td>${patient.full_name}</td>
                <td>${formattedDob}</td>
                <td>${patient.gender}</td>
                <td>${patient.contact_phone || 'N/A'}</td>
            `;

            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading patients</td></tr>';
    }
}

async function getAllPatients() {
    try {
        const result = await db.query(`SELECT * FROM ${PATIENTS_TABLE} ORDER BY registration_date DESC`);
        return { success: true, patients: result.rows || [] };
    } catch (error) {
        console.error('Error fetching patients:', error);
        return { success: false, error: error.message };
    }
}

async function registerPatient(fullName, dateOfBirth, contactPhone, gender){
    try{
        const patientId = generateUUID();
        await db.exec(`
            INSERT INTO ${PATIENTS_TABLE} (id, full_name, date_of_birth, contact_phone, gender)
            VALUES ('${patientId}', '${fullName}', '${dateOfBirth}', '${contactPhone}', '${gender}')
        `);

        return {success: true, patientId};
    } catch (error){
        console.error('Error registering patient:', error);
        return {success: false, error: error.message};
    }
}


async function resetDatabase(){
    try{
        await db.exec(`DROP TABLE IF EXISTS ${PATIENTS_TABLE}`);
        await db.exec(`
            CREATE TABLE ${PATIENTS_TABLE} (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                date_of_birth DATE NOT NULL,
                contact_phone TEXT,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                gender TEXT NOT NULL
            );
        `);
        return { success: true };
    } catch (error){
        console.error('Error resetting database:', error);
    }
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

    // Add reset database button event listener
    const resetDbButton = document.getElementById('reset-db');
    if (resetDbButton) {
        resetDbButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset the database? This will delete all patient data.')) {
                const result = await resetDatabase();
                if (result && result.success) {
                    alert('Database reset successfully');
                    if (document.getElementById('patient-list').classList.contains('active')) {
                        loadPatients();
                    }
                } else {
                    alert('Failed to reset database');
                }
            }
        });
    }

    const registerForm = document.getElementById('registration-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('full-name').value.trim();
            const dateOfBirth = document.getElementById('date-of-birth').value.trim();
            const contactPhone = document.getElementById('contact-phone').value.trim();
            const gender = document.getElementById('gender').value.trim();

            let isValid = true;

            if(!fullName){
                document.getElementById('full-name-error').textContent = 'Full name is required';
                isValid = false;
            } else {
                document.getElementById('full-name-error').textContent = '';
            }    

            if(!dateOfBirth){
                document.getElementById('date-of-birth-error').textContent = 'Date of birth is required';
                isValid = false;
            } else {
                document.getElementById('date-of-birth-error').textContent = '';
            }

            if(!gender){
                document.getElementById('gender-error').textContent = 'Gender is required';
                isValid = false;
            } else {
                document.getElementById('gender-error').textContent = '';
            }

            if(!isValid){
                return;
            }

            const feedback = document.getElementById('form-feedback');
            if (feedback) {
                feedback.textContent = 'Registering patient...';
                feedback.classList.remove('success', 'error');
            }

            const result = await registerPatient(fullName, dateOfBirth, contactPhone, gender);
            if(result.success){
                if (feedback) {
                    feedback.textContent = 'Patient registered successfully!';
                    feedback.classList.add('success');
                }
                registerForm.reset();
                // Show the patient list after successful registration
                showSection('patient-list');
            } else {
                if (feedback) {
                    feedback.textContent = `Error: ${result.error}`;
                    feedback.classList.add('error');
                }
            }

        });
    }


            
}); 
    
    
