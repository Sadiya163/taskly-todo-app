
const STORAGE_KEY = "taskly_tasks_v1";

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskDate = document.getElementById("taskDate");
const taskTime = document.getElementById("taskTime");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");

const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");
const editTitle = document.getElementById("editTitle");
const editDate = document.getElementById("editDate");
const editTime = document.getElementById("editTime");

let tasks = loadTasks();
let currentFilter = "all";
let editingTaskId = null;

// Load tasks from LocalStorage
function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

// Save tasks
function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Generate unique ID
function makeId() {
    return window.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random()}`;
}

// Format date and time
function formatDueDate(date, time) {
    if (!date) return "";

    const datePart = new Date(`${date}T00:00:00`)
        .toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric"
        });

    return time ? `${datePart} at ${time}` : datePart;
}

// Check overdue tasks
function isOverdue(task) {
    if (!task.date || task.completed) return false;

    const due = new Date(
        `${task.date}T${task.time || "23:59"}`
    );

    return due < new Date();
}

// Update statistics
function updateStats() {
    const completed = tasks.filter(
        task => task.completed
    ).length;

    document.getElementById("totalCount").textContent =
        tasks.length;

    document.getElementById("completedCount").textContent =
        completed;

    document.getElementById("pendingCount").textContent =
        tasks.length - completed;

    document.getElementById("taskCounter").textContent =
        `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
}

// Create task element
function createTaskElement(task) {
    const item = document.createElement("article");

    item.className = `task-item${task.completed ? " done" : ""}`;

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = Boolean(task.completed);

    checkbox.setAttribute(
        "aria-label",
        `Mark ${task.title} as completed`
    );

    checkbox.addEventListener("change", () => {
        task.completed = checkbox.checked;
        saveTasks();
        renderTasks();
    });

    const main = document.createElement("div");
    main.className = "task-main";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;

    const meta = document.createElement("div");

    meta.className =
        `task-meta${isOverdue(task) ? " overdue" : ""}`;

    meta.textContent = task.date
        ? `${isOverdue(task) ? "Overdue · " : "Due · "}${formatDueDate(task.date, task.time)}`
        : "No deadline set";

    main.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    // Edit button
    const editButton = document.createElement("button");

    editButton.type = "button";
    editButton.className = "icon-btn";
    editButton.textContent = "✎";
    editButton.title = "Edit task";

    editButton.addEventListener("click", () => {
        openEditDialog(task.id);
    });

    // Delete button
    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "icon-btn delete";
    deleteButton.textContent = "×";
    deleteButton.title = "Delete task";

    deleteButton.addEventListener("click", () => {
        if (confirm(`Delete "${task.title}"?`)) {
            tasks = tasks.filter(
                item => item.id !== task.id
            );

            saveTasks();
            renderTasks();
        }
    });

    actions.append(editButton, deleteButton);
    item.append(checkbox, main, actions);

    return item;
}

// Display tasks
function renderTasks() {
    taskList.replaceChildren();

    const searchTerm = searchInput.value.trim().toLowerCase();

    let visibleTasks = tasks.filter(task => {
        const matchesFilter =
            currentFilter === "all" ||
            (currentFilter === "pending" && !task.completed) ||
            (currentFilter === "completed" && task.completed);

        return matchesFilter &&
            task.title.toLowerCase().includes(searchTerm);
    });

    // Sort pending tasks first, then by due date
    visibleTasks.sort((a, b) => {
        if (a.completed !== b.completed) {
            return Number(a.completed) - Number(b.completed);
        }

        if (!a.date) return 1;
        if (!b.date) return -1;

        return `${a.date}T${a.time || "23:59"}`
            .localeCompare(`${b.date}T${b.time || "23:59"}`);
    });

    if (visibleTasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        const icon = document.createElement("div");
        icon.className = "empty-icon";
        icon.textContent = searchTerm ? "⌕" : "✦";

        const heading = document.createElement("strong");
        heading.textContent = searchTerm
            ? "No matching tasks"
            : "Nothing here yet";

        const message = document.createElement("p");
        message.textContent = searchTerm
            ? "Try another search term."
            : "Add a task above and make your day productive.";

        empty.append(icon, heading, message);
        taskList.append(empty);

    } else {
        visibleTasks.forEach(task => {
            taskList.append(createTaskElement(task));
        });
    }

    updateStats();
}

// Open edit popup
function openEditDialog(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    editingTaskId = id;

    editTitle.value = task.title;
    editDate.value = task.date || "";
    editTime.value = task.time || "";

    editDialog.showModal();
    editTitle.focus();
}

// Add new task
taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = taskInput.value.trim();

    if (!title) {
        taskInput.focus();
        return;
    }

    const newTask = {
        id: makeId(),
        title: title,
        date: taskDate.value,
        time: taskTime.value,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);

    saveTasks();
    taskForm.reset();
    taskInput.focus();

    currentFilter = "all";

    document.querySelectorAll(".filter").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.filter === "all"
        );
    });

    renderTasks();
});

// Save edited task
editForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = editTitle.value.trim();

    if (!title) {
        editTitle.focus();
        return;
    }

    const task = tasks.find(
        item => item.id === editingTaskId
    );

    if (task) {
        task.title = title;
        task.date = editDate.value;
        task.time = editTime.value;

        saveTasks();
    }

    editDialog.close();
    editingTaskId = null;

    renderTasks();
});

// Close edit popup
function closeEditDialog() {
    editDialog.close();
    editingTaskId = null;
}

document.getElementById("closeDialog")
    .addEventListener("click", closeEditDialog);

document.getElementById("cancelEdit")
    .addEventListener("click", closeEditDialog);

// Filter buttons
document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        document.querySelectorAll(".filter").forEach(item => {
            item.classList.toggle(
                "active",
                item === button
            );
        });

        renderTasks();
    });
});

// Search tasks
searchInput.addEventListener("input", renderTasks);

// Display today's date
document.getElementById("todayLabel").textContent =
    new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long"
    });

// Initial display
renderTasks();
