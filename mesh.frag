#version 440
out vec4 color;
in vec3 normal;
uniform vec3 lightvector = vec3(0, 1, 1);
void main()
{
    color = (vec4(dot(normalize(normal.xyz), normalize(lightvector)))) * 0.5;

    //if(color.x < 0)
    //{
        //color = vec4(-color.x, -color.x * 0.5, 0, 1) * 0.7;
    //}

    //color = vec4(normal.xyz*0.5+0.5, 1.0);
    //color = vec4(normalize(normal.xyz)*0.5+0.5, 1.0);
}
