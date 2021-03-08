#version 440
uniform sampler2D background;
out vec4 color;
in vec2 texcoord;
void main()
{
    color = texture(background, vec2(texcoord.x,1-texcoord.y));
}
