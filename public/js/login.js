document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const response = await fetch("/login", {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    })

    const result = await response.json();

    if(result.success){
        if(result.newAccount){
            alert("Account not found in database... creating account");
        }
        window.location.href= '/'
    }
    else{
        document.getElementById('message').textContent = result.message;
    }
})