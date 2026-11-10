int codigo; 
int estado;
int led1 = 5;
int led2 = 7; 
int bocina = 6; 
int sensor = 0; 
int contra = 1234; 
void setup()
{
 pinMode (led1,OUTPUT);
 pinMode (led2,OUTPUT);
 pinMode (sensor,INPUT);
 pinMode (bocina,OUTPUT);
  Serial.begin (9600);  
}

void loop()
{
  
  if ( estado == false)
  
  {
    Serial.println ("Ingresar codigo de activacion");
    codigo=Serial.parseInt();
    if (codigo == contra)
    {
      Serial.println("Alarma Activada") ;
      estado=true;
    }
  }
  if (estado == true )
  
  {
	codigo = Serial.parseInt(); 
    
    if  (codigo== contra)
    {
      Serial.println ("Alarma desactivada sin movimiento");
      estado=false; 
    }
  }
  if (estado == true)
  {
  	if(digitalRead(sensor)== HIGH && estado == true)
    {
    	Serial.println ("Movimiento Detectado"); 
      	Serial.println ("Ingrese El Codigo Para Desactivar");
      
      while (estado == true)
      {
        tone(bocina,2500);
        digitalWrite(led1, LOW);
        digitalWrite(led2, HIGH);
        delay(1000); 
        digitalWrite (led1, HIGH );
        digitalWrite (led2, LOW);
        
        codigo= Serial.parseInt();
        
        if (contra==codigo)
        {
        	Serial.println ("Alarma desactivada");
          	noTone(bocina); 
          	estado = false; 
          	digitalWrite(led1, LOW);
        }
      }
    }
  }
}	
