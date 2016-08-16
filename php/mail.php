<?php 
$to = "you@yourdomain.com";



$subject = ($_POST['name']); 
$message = "Someone sent you a message from your website."; 
$message .= "\n\n............................................................................\n\n";
$message .= ($_POST['message']); 
$message .= "\n\n............................................................................\n\n"; 
$message .= "E-mail sent by: " . $_POST['name'] . " <" . $_POST['email']  . ">\n"; 
$headers = "From: " . $_POST['name'] . " <" . $_POST['email'] . ">\n"; 
if(@mail($to, $subject, $message, $headers)) 
{ 
    echo "answer=ok"; 
}  
else  
{ 
    echo "answer=error"; 
}
$sender = ($_POST['email']);
$confirmMessage = "This is a confirmation of your submitted form."; 
$confirmMessage .= "\n\n............................................................................\n\n";
$confirmMessage .= ($_POST['message']); 
$confirmMessage .= "\n\n............................................................................\n\n"; 
$confirmMessage .= "E-mail sent by: " . $_POST['name'] . " <" . $_POST['email']  . ">\n"; 
@mail($sender, $subject, $confirmMessage, $headers)
?>