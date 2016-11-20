<html>
<head>
</head>
<body>

<form ation="button2.php" method="post">
<table>
  <tr>
    <td>API ID:</td><td><input type="text" name="id" size="32"></td>
  </tr>
    <tr>
    <td>API SECRET:</td><td><input type="text" name="secret" size="32"></td>
  </tr>
    <tr>
   <td colspan="2"><input type="submit" name="getmaillist" value="Показать список адресных книг аккаунта."></td>
  </tr> 
    <tr>
   <td><input type="text" name="bookname" size="15"></td><td><input type="submit" name="newbook" value="Создать новую адресную книгу."></td>
  </tr> 
  </table>
</form>
<hr>
<?php
$id = $_POST['id'];
$secret = $_POST['secret'];
if ($id) {echo "$id <b>- your ID </b><br />";}
else echo "Empty API ID <br />";
if ($secret) {echo "$secret <b>- your Secret </b><br />";}
else echo "Empty API Secret <br />";
//___________|____________________
    require_once( 'api/sendpulseInterface.php' );
    require_once( 'api/sendpulse.php' );
    // https://login.sendpulse.com/settings/#api
    define( 'API_USER_ID', $_POST['id'] );
    define( 'API_SECRET', $_POST['secret'] );
    define( 'TOKEN_STORAGE', 'file' );
		if ($id && $secret) {
    $SPApiProxy = new SendpulseApi( API_USER_ID, API_SECRET, TOKEN_STORAGE );
    // Get Mailing Lists list example
	if ($_POST['getmaillist'])
    var_dump( $SPApiProxy->listAddressBooks() );
	//Create new address book
	if ($_POST['newbook'])
	{
		$bookname=$_POST['bookname'];
		var_dump ( $SPApiProxy->createAddressBook( "$bookname" ));
	}
	}
?>


</body>
</html>