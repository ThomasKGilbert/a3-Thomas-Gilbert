// FRONT-END (CLIENT) JAVASCRIPT HERE
const inputText = document.getElementById("task-text");
const taskListContainer = document.getElementById("task-list-container");
const priority = document.getElementById("priority");

inputText.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    document.getElementById("add-task").click();
  }
})

taskListContainer.addEventListener("click", function(event) {
  if(event.target.classList.contains("delete-btn")) {
    const id = Number(event.target.dataset.id);
    deleteTask(id);
  }
});

taskListContainer.addEventListener("change", function(event) {
  if(event.target.matches('input[type="checkbox"]')) {
    const id = Number(event.target.dataset.id);
    toggleTask(id);
  }
})

async function addTask() {
  if(inputText.value === "") {
    alert("Please enter a task");
    return;
  }

  const newTask = {
    task: inputText.value,
    priority: priority.value,
    done: false,
    creationDate: new Date().toISOString().split("T")[0],
  };

  try{
    const response = await fetch("/add-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    })

    if(response.ok){
      const updatedTodoList = await response.json();
      renderTaskList(updatedTodoList);
      inputText.value = "";
    }
    else{
      console.error("Server Error: ", response.statusText);
    }
  }catch(e){
    console.error("Failed to add task: ", e);
    alert("There was a problem adding task!");
  }
}

async function deleteTask(id) {
  try {
    const response = await fetch("/delete-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({id}),
    })

    if(response.ok){
      const updatedTodoList = await response.json();
      renderTaskList(updatedTodoList);
    }
    else{
      console.error("Server Error: ", response.statusText);
    }
  } catch(e){
    console.error("Failed to delete task: ", e);
  }
}

async function toggleTask(id) {
  try {
    const response = await fetch("/toggle-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({id}),
    })

    if(response.ok){
      const updatedTodoList = await response.json();
      renderTaskList(updatedTodoList);
    }
    else{
      console.error("Server Error: ", response.statusText);
    }
  } catch(e){
    console.error("Failed to delete task: ", e);
  }
}

function renderTaskList(todoList) {
  taskListContainer.innerHTML = "";

  todoList.forEach(task => {
    let li = document.createElement("li");
    li.dataset.id = task.id;
    li.innerHTML = `
<div class="task-section">
<input type="checkbox" id="task-${task.id}" data-id="${task.id}" ${task.done ? "checked" : ""} />
<label for="task-${task.id}">${task.task}</label>
<span class="deadline">Due: ${task.deadline}</span>
</div>
<button class="delete-btn" data-id="${task.id}">Delete</button>
`;

    taskListContainer.appendChild(li);
  });
}

async function loadTaskList() {
  const response = await fetch("/task-list");
  const taskList = await response.json();
  renderTaskList(taskList);
}

loadTaskList();
