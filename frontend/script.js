const API = "/api/students";

async function loadStudents() {
    const response = await fetch(API);
    const students = await response.json();

    const tbody = document.getElementById("students");
    tbody.innerHTML = "";

    students.forEach(student => {
        tbody.innerHTML += `
            <tr>
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.course}</td>
                <td>
                    <button onclick="deleteStudent(${student.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
}

async function addStudent() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const course = document.getElementById("course").value.trim();

    if (!name || !email || !course) {
        alert("Fill all fields");
        return;
    }

    const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, course })
    });

    if (!response.ok) {
        alert("Failed to add student");
        return;
    }

    document.getElementById("name").value = "";
    document.getElementById("email").value = "";
    document.getElementById("course").value = "";

    loadStudents();
}

async function deleteStudent(id) {
    const response = await fetch(`${API}/${id}`, {
        method: "DELETE"
    });

    if (response.ok) {
        loadStudents();
    }
}

loadStudents();
