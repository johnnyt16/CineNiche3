namespace CineNiche.API.DTOs
{
    public class UserInfoDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsAdmin { get; set; }
    }
} 