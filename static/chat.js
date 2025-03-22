let lastSelectedButton = '';

let isLoading = false;

let currentField = '';

let customizeFormData = {
    phone: '',
    email: '',
};

let recognition = null;
let isListening = false;

$(document).ready(function () {


    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = function() {
            isListening = true;
            $('#voiceButton').addClass('listening');
            $('#voiceIcon').attr('src', 'https://cdn-icons-png.flaticon.com/512/3959/3959542.png');
        };

        recognition.onend = function() {
            isListening = false;
            $('#voiceButton').removeClass('listening');
            $('#voiceIcon').attr('src', 'https://cdn-icons-png.flaticon.com/512/709/709682.png');
        };

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            $('#text').val(transcript);
            $('#send').prop('disabled', false);
            sendMessage();
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            $('#voiceButton').removeClass('listening');
            $('#voiceIcon').attr('src', 'https://cdn-icons-png.flaticon.com/512/709/709682.png');
        };
    }




    // Display initial greeting and root buttons
    initializeChat();

    // Handle form submission
    $("#messageArea").on("submit", function (event) {
        event.preventDefault();
        sendMessage();
    });

    // Handle input changes
    $('#text').on('input', function () {
        $('#send').prop('disabled', $(this).val().trim() === "");
    });

    // Handle refresh button click
    $('#refreshButton').on('click', function () {
        resetChat();
    });

    $('#voiceButton').on('click', function() {
        if (!recognition) {
            appendBotMessage("Speech recognition is not supported in your browser.");
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
});


// Initialize the chat with the greeting and root buttons
function initializeChat() {
    $.get("/get_greeting", function (data) {
        appendBotMessage(data.greeting);
        appendButtons(data.buttons);
    }).fail(function (error) {
        console.error('Failed to load greeting:', error);
        appendBotMessage("Sorry, I couldn't load the initial options. Please try refreshing the page.");
    });
}

// Reset the chat to its initial state
function resetChat() {
    $("#messageFormeight").empty(); // Clear the chat window
    initializeChat(); // Reload the greeting and root buttons
    lastSelectedButton = ''; // Reset the last selected button
    currentField = ''; // Reset the customize form state
    customizeFormData = { phone: '', email: '', description: '' }; // Clear form data
    $("#text").attr("type", "text").attr("placeholder", "Type your message here..."); // Reset input field
}

// Get the current time in HH:MM format
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Append a bot message to the chat window
function appendBotMessage(message) {
    const time = getCurrentTime();
    const botHtml = `
        <div class="d-flex justify-content-start mb-4">
            <div class="img_cont_msg">
                <img src="https://cdn-icons-png.flaticon.com/512/4712/4712100.png"
                     class="rounded-circle user_img_msg" alt="AI Avatar">
            </div>
            <div class="msg_cotainer">
                ${message}
                <span class="msg_time">${time}</span>
            </div>
        </div>`;
    $("#messageFormeight").append(botHtml);
    scrollToBottom();
}

// Append a user message to the chat window
function appendUserMessage(message) {
    const time = getCurrentTime();
    const userHtml = `
        <div class="d-flex justify-content-end mb-4">
            <div class="msg_cotainer_send">
                ${message}
                <span class="msg_time_send">${time}</span>
            </div>
        </div>`;
    $("#messageFormeight").append(userHtml);
    scrollToBottom();
}

// Append buttons to the chat window
function appendButtons(buttons) {
    const buttonsHtml = `
        <div class="d-flex justify-content-start mb-4 flex-wrap">
            ${buttons.map(button => `
                <button class="btn btn-primary m-1" onclick="showButtons('${button.value}')">
                    ${button.label}
                </button>
            `).join('')}
        </div>`;
    $("#messageFormeight").append(buttonsHtml);
    scrollToBottom();
}

// Send a message to the server and handle the response
function sendMessage() {

    
    const msg = $("#text").val().trim();
    if (msg === "") return;

    appendUserMessage(msg);
    $("#text").val("");
    $('#send').prop('disabled', true);

    if (currentField) {
        processCustomizeInput(msg);
    } else {
        showLoadingIndicator();
        isLoading = true;


        $.ajax({
            data: { 
                msg: msg,
                button_path: lastSelectedButton
            },
            type: "POST",
            url: "/get",
            success: function (data) {

                removeLoadingIndicator();
                isLoading = false;

                // Check if response is a cooling graph

                if (data.type === "cooling_graph") {
                    // Display the cooling graph image
                    const graphHtml = `
                        <div class="d-flex justify-content-start mb-4">
                            <div class="img_cont_msg">
                                <img src="https://cdn-icons-png.flaticon.com/512/4712/4712100.png"
                                     class="rounded-circle user_img_msg">
                            </div>
                            <div class="msg_cotainer">
                                <p>Here's the cooling performance graph for ${data.modelName}:</p>
                                <img src="${data.coolingImageUrl}" alt="Cooling Graph" class="cooling-graph-img" style="max-width: 100%; margin-top: 10px;">
                                <span class="msg_time">${getCurrentTime()}</span>
                            </div>
                        </div>`;
                    $("#messageFormeight").append(graphHtml);
                } else {
                    appendBotMessage(data);
                }
                scrollToBottom();
            },
            error: function (xhr, status, error) {

                 // Remove loading indicator on error
                 removeLoadingIndicator();
                 isLoading = false;
                 
                console.error('Error sending message:', error);
                appendBotMessage("Sorry, I encountered an error while processing your request. Please try again.");
            }
        });
    }
}

// Scroll the chat window to the bottom
function scrollToBottom() {
    const messageContainer = $('#messageFormeight');
    messageContainer.scrollTop(messageContainer[0].scrollHeight);
}

// Handle button selection
function showButtons(selectedButton) {
    if (selectedButton === 'Customize') {
        handleCustomizeProduct();
        return;
    }

    lastSelectedButton = selectedButton;

    $.ajax({
        type: "POST",
        url: "/get_buttons",
        data: { selected_button: selectedButton },
        success: function (data) {
            let pdfUrl = getPdfUrlForButton(selectedButton);

            if (data.buttons && data.buttons.length > 0) {
                appendBotMessage(`Please select an option for ${data.current_label}:`);
                appendButtons(data.buttons);
            } else {
                const productPrompt = `
                    <div class="product-info mb-3">
                        <p>You can find detailed specifications in the <a href="${pdfUrl}" target="_blank">product datasheet</a>.</p>
                        <p>Or type your specific question about this product below, and I'll help you find the information you need.</p>
                    </div>
                `;
                appendBotMessage(productPrompt);

                const text = `Tell me about ${selectedButton}`;
                $("#text").val(text);
                sendMessage();
            }
        },
        error: function (xhr, status, error) {
            console.error('Error fetching buttons:', error);
            appendBotMessage("Sorry, I couldn't load the options. Please try again.");
        }
    });
}

// Get the PDF URL for a specific button
function getPdfUrlForButton(selectedButton) {
    const pdfMappings = {
        // auxiliary single inverter
        'single_inverter.17kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive_RPCS-730-17K-17K3K_28K_datasheet_EN_V02.pdf",
        'single_inverter.28kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive_RPCS-730-17K-17K3K_28K_datasheet_EN_V02.pdf",
        // auxiliary dual inverter
        'Dual_inverter.2x15kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive_RPCS-730-2x15K-2x30K_450V_datasheet_EN_V02.pdf",
        "Dual_inverter.2x17kva": "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20241021_REFUdrive_RPCS-740-2x17K_datasheet_EN_V03.pdf",
        'Dual_inverter.2x30kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive_RPCS-730-2x15K-2x30K_450V_datasheet_EN_V02.pdf",
        'Dual_inverter.2x28kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive_RPCS-730-2x28K-2x55K_850V_datasheet_EN_V02.pdf",
        'Dual_inverter.2x55kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive_RPCS-730-2x28K-2x55K_850V_datasheet_EN_V02.pdf",
        // Traction inverter
        'traction_inverter.80kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221124_REFUdrive_RPCS-730-80K-160K_450V_datasheet_EN_V03.pdf",
        'traction_inverter.160kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221124_REFUdrive_RPCS-730-80K-160K_450V_datasheet_EN_V03.pdf",
        'traction_inverter.320kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221124_REFUdrive_RPCS-730-150K-320K_850V_datasheet_EN_V03.pdf",
        'traction_inverter.150kva':"https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221124_REFUdrive_RPCS-730-150K-320K_850V_datasheet_EN_V03.pdf",
        'traction_inverter.320kva-HPP':"https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive_RPCS-730-320K-HPP_datasheet_EN_V02.pdf",
        // Combi inverter
        'combi_inverter.17k3k': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive_RPCS-730-17K-17K3K_28K_datasheet_EN_V02.pdf",
        // Cabinet inverter
        'cabinet_inverter.8kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive-RPCS-630_datasheet_EN_V03.pdf",
        'cabinet_inverter.22kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive-RPCS-630_datasheet_EN_V03.pdf",
        'cabinet_inverter.55kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive-RPCS-630_datasheet_EN_V03.pdf",
        'cabinet_inverter.90kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive-RPCS-630_datasheet_EN_V03.pdf",
        'cabinet_inverter.200kva': "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive-RPCS-630_datasheet_EN_V03.pdf",
        // DC-DC 
        "DC_DC.4kw-900": "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20241024_REFUdrive_RPCS-DC4K-900_6K-750_datasheet_EN_V02.pdf",
        "DC_DC.4kw-750": "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20241024_REFUdrive_RPCS-DC4K-900_6K-750_datasheet_EN_V02.pdf",
        //OBC
        "OBC.450V": "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20230921_REFUdrive_22kW_On-Board_Charger_datasheet_EN_V11.pdf",
        "OBC.800V": "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20230921_REFUdrive_22kW_On-Board_Charger_datasheet_EN_V11.pdf",
        "OBC.850V": "https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20230921_REFUdrive_22kW_On-Board_Charger_datasheet_EN_V11.pdf",
        //BCS
        "BCS.IP68housing":"https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive-Ladeeinheit-AFE220_datasheet_EN_V02.pdf",
        "BCS.Cabinet/Component":"https://www.refu-drive.com/fileadmin/user_upload/Downloads/Datenblaetter/EN/20221118_REFUdrive-Ladeeinheit-AFE220_datasheet_EN_V02.pdf",
    };

    for (const key in pdfMappings) {
        if (selectedButton.includes(key)) {
            return pdfMappings[key];
        }
    }
    return "#"; // Default fallback URL
}

// Handle the "Customize Product" flow
function handleCustomizeProduct() {
    currentField = 'phone';
    appendBotMessage("Please enter your mobile number:");
    $("#text").attr("type", "tel").attr("placeholder", "Enter your mobile number");
}

// Process input for the "Customize Product" flow
function processCustomizeInput(input) {
    switch (currentField) {
        case 'phone':
            if (validatePhone(input)) {
                customizeFormData.phone = input;
                currentField = 'email';
                appendBotMessage("Great! Now please enter your email address:");
                $("#text").attr("type", "email").attr("placeholder", "Enter your email");
            } else {
                appendBotMessage("Please enter a valid mobile number.");
            }
            break;

        case 'email':
            if (validateEmail(input)) {
                customizeFormData.email = input;
                currentField = 'description';
                appendBotMessage("Excellent! Finally, please describe the product customization you're looking for:");
                $("#text").attr("type", "text").attr("placeholder", "Enter your requirements");
            } else {
                appendBotMessage("Please enter a valid email address.");
            }
            break;

        case 'description':
            customizeFormData.description = input;
            submitCustomizeData();
            customizeFormData = { phone: '', email: '', description: '' };
            currentField = '';
            $("#text").attr("type", "text").attr("placeholder", "Type your message here...");
            break;
    }
}

// Validate phone number
function validatePhone(phone) {
    return /^\d{10}$/.test(phone.replace(/[-\s]/g, ''));
}

// Validate email address
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Submit the customize form data
// Submit the customize form data
function submitCustomizeData() {
    appendBotMessage("Thank you for providing your information! Our team will contact you soon.");
    console.log("Form Data Collected:", customizeFormData);

    // Send data to the server
    fetch('/submit_customize_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(customizeFormData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            console.log('Data stored successfully:', data.message);
        } else {
            console.error('Error storing data:', data.error);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}



// Call displayGraph() when the user confirms they want to see the graph



function showLoadingIndicator() {
    const loadingHtml = `
        <div class="d-flex justify-content-start mb-4 loading-message">
            <div class="img_cont_msg">
                <img src="https://cdn-icons-png.flaticon.com/512/4712/4712100.png"
                     class="rounded-circle user_img_msg">
            </div>
            <div class="msg_cotainer loading-container">
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <span class="msg_time">${getCurrentTime()}</span>
            </div>
        </div>`;
    $("#messageFormeight").append(loadingHtml);
    scrollToBottom();
}

// Function to remove loading indicator
function removeLoadingIndicator() {
    $(".loading-message").remove();
}
